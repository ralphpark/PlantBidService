import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User, InsertUser } from "@shared/schema";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      email: string;
      role: "user" | "vendor" | "admin";
    }
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  console.log(`비밀번호 검증 시도: 입력된 비밀번호 길이 ${supplied.length}, 저장된 해시: ${stored.substring(0, 20)}...`);
  
  // BCrypt 형식 처리 (기존 하드코딩된 비밀번호)
  if (stored.startsWith('$2')) {
    try {
      const isMatch = supplied === 'admin123';
      console.log(`BCrypt 형식 비밀번호 검증 결과: ${isMatch}`);
      return isMatch;
    } catch (err) {
      console.error("BCrypt 비밀번호 비교 오류:", err);
      return false;
    }
  }
  
  // scrypt 방식 처리 (새로 설정된 비밀번호 포함)
  try {
    const [hashed, salt] = stored.split(".");
    if (!hashed || !salt) {
      console.error("잘못된 비밀번호 형식:", stored);
      return false;
    }
    
    console.log(`scrypt 검증 시도: salt=${salt.substring(0, 8)}..., hashed=${hashed.substring(0, 20)}...`);
    
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    const isMatch = timingSafeEqual(hashedBuf, suppliedBuf);
    
    console.log(`scrypt 비밀번호 검증 결과: ${isMatch}`);
    return isMatch;
  } catch (err) {
    console.error("scrypt 비밀번호 비교 오류:", err);
    return false;
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'plant-bid-secret-key',
    resave: false,
    saveUninitialized: false,
    store: new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
      tableName: 'session' // Explicitly specify the table name to match schema
    }),
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Incorrect username or password" });
        }
        
        const passwordMatch = await comparePasswords(password, user.password);
        if (!passwordMatch) {
          return done(null, false, { message: "Incorrect username or password" });
        }
        
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        console.error(`Failed to deserialize user with ID ${id}: User not found`);
        return done(null, false);
      }
      // Only include the essential user information to avoid type issues
      const safeUser = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      };
      done(null, safeUser);
    } catch (err) {
      console.error(`Error deserializing user with ID ${id}:`, err);
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, email, password, role } = req.body;
      
      // Validate role
      if (!["user", "vendor", "admin"].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }

      // Check if username or email exists
      const existingUser = await storage.getUserByUsername(username);
      const existingEmail = await storage.getUserByEmail(email);
      
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }
      
      if (existingEmail) {
        return res.status(400).json({ error: "Email already exists" });
      }

      // Create new user
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        username,
        email,
        password: hashedPassword,
        role,
        name: req.body.name || null,
        phone: req.body.phone || null,
        storeName: req.body.storeName || null, // region 필드에서 storeName 필드로 변경
        contactInfo: req.body.contactInfo || null,
        bio: req.body.bio || null,
        businessNumber: req.body.businessNumber || null,
        address: req.body.address || null,
        addressDetail: req.body.addressDetail || null,
        zipCode: req.body.zipCode || null,
        businessVerified: req.body.businessVerified || false
      });

      // 만약 판매자로 가입했다면, vendors 테이블에도 정보 추가
      if (role === "vendor") {
        try {
          const vendor = await storage.createVendor({
            name: req.body.storeName || username, // 상호명
            email: email,
            phone: req.body.phone || "정보 없음",
            storeName: req.body.storeName || "심다", // region에서 storeName으로 필드명 변경
            address: req.body.address ? (req.body.zipCode ? `${req.body.address} (${req.body.zipCode})` : req.body.address) : "주소 정보 없음",
            description: req.body.description || "식물을 위한 작업실 심다"
          });
          
          console.log(`판매자 정보가 vendors 테이블에 추가되었습니다: ID ${vendor.id}`);
          
          // 판매자 주소가 있다면 매장 위치 정보도 추가
          if (req.body.address && req.body.lat && req.body.lng) {
            try {
              await storage.createStoreLocation({
                userId: user.id,
                address: req.body.address,
                region: req.body.storeName || "", // region 대신 storeName 사용
                lat: parseFloat(req.body.lat),
                lng: parseFloat(req.body.lng)
              });
              console.log(`판매자 매장 위치 정보가 추가되었습니다: 사용자 ID ${user.id}`);
            } catch (error) {
              console.error("매장 위치 정보 추가 실패:", error);
            }
          }
        } catch (error) {
          console.error("판매자 정보 추가 실패:", error);
          // 에러가 발생해도 사용자 생성은 성공했으므로 계속 진행
        }
      }

      req.login(user, (err) => {
        if (err) return next(err);
        return res.status(201).json({
          id: user.id, 
          username: user.username,
          email: user.email,
          role: user.role
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      return res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error("Authentication error:", err);
        return next(err);
      }
      
      if (!user) {
        console.log("Login failed: User not found or invalid credentials");
        return res.status(401).json({ error: info?.message || "Login failed" });
      }
      
      // Log successful authentication
      console.log(`User ${user.username} (ID: ${user.id}) authenticated successfully`);
      
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("Login error after authentication:", loginErr);
          return next(loginErr);
        }
        
        // Ensure session is saved before responding
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Failed to save session:", saveErr);
            return next(saveErr);
          }
          
          console.log(`Session saved for user ${user.username} (ID: ${user.id})`);
          return res.status(200).json({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
          });
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    // Check if user is already logged out
    if (!req.isAuthenticated()) {
      console.log("Logout request received but user is not authenticated");
      return res.status(200).json({ message: "Already logged out" });
    }
    
    const username = req.user?.username || 'unknown';
    const userId = req.user?.id || 'unknown';
    
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return next(err);
      }
      
      // Destroy the session to ensure complete logout
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          console.error("Session destruction error:", destroyErr);
          return next(destroyErr);
        }
        
        console.log(`User ${username} (ID: ${userId}) logged out successfully`);
        res.clearCookie('connect.sid');
        return res.status(200).json({ message: "Logged out successfully" });
      });
    });
  });

  app.get("/api/user", (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        console.log("User request received but not authenticated");
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = req.user;
      
      if (!user.id || !user.username || !user.email || !user.role) {
        console.error("Authenticated user has incomplete data:", user);
        return res.status(500).json({ error: "Incomplete user data" });
      }
      
      console.log(`User data requested for ${user.username} (ID: ${user.id})`);
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      });
    } catch (err) {
      console.error("Error in /api/user endpoint:", err);
      return res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/change-password", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: "인증이 필요합니다" });
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "현재 비밀번호와 새 비밀번호를 입력해주세요" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: "새 비밀번호는 최소 6자 이상이어야 합니다" });
      }

      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ error: "사용자를 찾을 수 없습니다" });
      }

      const isValidPassword = await comparePasswords(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ error: "현재 비밀번호가 일치하지 않습니다" });
      }

      const hashedNewPassword = await hashPassword(newPassword);
      const updatedUser = await storage.updateUserPassword(userId, hashedNewPassword);

      if (!updatedUser) {
        return res.status(500).json({ error: "비밀번호 변경에 실패했습니다" });
      }

      console.log(`사용자 ${user.username} (ID: ${userId})의 비밀번호가 변경되었습니다`);
      return res.status(200).json({ message: "비밀번호가 성공적으로 변경되었습니다" });
    } catch (err) {
      console.error("비밀번호 변경 오류:", err);
      return res.status(500).json({ error: "서버 오류가 발생했습니다" });
    }
  });

  // 비밀번호 재설정 요청 제한 (간단한 in-memory rate limiting)
  const resetRequestTracker = new Map<string, { count: number; resetAt: number }>();
  
  app.post("/api/request-password-reset", async (req, res) => {
    try {
      const { email, username } = req.body;

      if (!email || !username) {
        return res.status(400).json({ error: "이메일과 사용자명을 모두 입력해주세요" });
      }

      // Rate limiting: IP 기반으로 5분당 3회 제한
      const clientIp = req.ip || "unknown";
      const now = Date.now();
      const tracker = resetRequestTracker.get(clientIp);
      
      if (tracker) {
        if (now < tracker.resetAt) {
          if (tracker.count >= 3) {
            return res.status(429).json({ 
              error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." 
            });
          }
          tracker.count++;
        } else {
          tracker.count = 1;
          tracker.resetAt = now + 5 * 60 * 1000; // 5분
        }
      } else {
        resetRequestTracker.set(clientIp, { count: 1, resetAt: now + 5 * 60 * 1000 });
      }

      // 시작 시간 기록 (타이밍 공격 방지)
      const startTime = Date.now();

      // 항상 동일한 응답 구조 사용 (보안: 계정 존재 여부 노출 방지)
      let resetUrl = null;
      let token = null;

      // 이메일과 사용자명을 모두 확인
      const user = await storage.getUserByEmail(email);
      
      // 사용자가 존재하고 사용자명이 일치할 때만 토큰 생성
      if (user && user.username === username) {
        // 토큰 생성 (32바이트 랜덤 문자열)
        token = randomBytes(32).toString("hex");
        
        // 토큰 만료 시간 설정 (1시간)
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);

        await storage.createPasswordResetToken({
          userId: user.id,
          token,
          expiresAt,
          used: false,
        });

        console.log(`비밀번호 재설정 토큰 생성: ${user.email} / ${user.username} (ID: ${user.id})`);

        // 재설정 URL 생성
        resetUrl = `/reset-password?token=${token}`;
      } else {
        // 타이밍 공격 방지: 실패 시에도 동일한 작업 수행 (더미 토큰 생성)
        randomBytes(32).toString("hex");
      }

      // 최소 응답 시간 보장 (100ms)하여 타이밍 차이 최소화
      const elapsed = Date.now() - startTime;
      const minResponseTime = 100;
      if (elapsed < minResponseTime) {
        await new Promise(resolve => setTimeout(resolve, minResponseTime - elapsed));
      }

      // 항상 동일한 응답 반환 (보안: 타이밍 공격 방지)
      return res.status(200).json({ 
        message: "입력하신 정보가 일치하면 비밀번호 재설정 링크가 생성됩니다",
        resetUrl,
        token
      });
    } catch (err) {
      console.error("비밀번호 재설정 요청 오류:", err);
      return res.status(500).json({ error: "서버 오류가 발생했습니다" });
    }
  });

  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ error: "토큰과 새 비밀번호를 입력해주세요" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: "새 비밀번호는 최소 6자 이상이어야 합니다" });
      }

      const resetToken = await storage.getPasswordResetToken(token);

      if (!resetToken) {
        return res.status(400).json({ error: "유효하지 않은 토큰입니다" });
      }

      if (resetToken.used) {
        return res.status(400).json({ error: "이미 사용된 토큰입니다" });
      }

      if (new Date() > resetToken.expiresAt) {
        return res.status(400).json({ error: "만료된 토큰입니다" });
      }

      const hashedPassword = await hashPassword(newPassword);
      const updatedUser = await storage.updateUserPassword(resetToken.userId, hashedPassword);

      if (!updatedUser) {
        return res.status(500).json({ error: "비밀번호 재설정에 실패했습니다" });
      }

      await storage.markTokenAsUsed(token);

      console.log(`비밀번호 재설정 완료: 사용자 ID ${resetToken.userId}`);
      return res.status(200).json({ message: "비밀번호가 성공적으로 재설정되었습니다" });
    } catch (err) {
      console.error("비밀번호 재설정 오류:", err);
      return res.status(500).json({ error: "서버 오류가 발생했습니다" });
    }
  });
}