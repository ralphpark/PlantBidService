import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { Pool } from "pg";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function resetAdminPassword() {
  // 데이터베이스 연결
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    // 새 비밀번호 생성 및 해시
    const newPassword = "admin123";
    const hashedPassword = await hashPassword(newPassword);
    
    // 관리자 비밀번호 업데이트
    const result = await pool.query(
      "UPDATE users SET password = $1 WHERE id = 2 AND username = 'admin'",
      [hashedPassword]
    );
    
    if (result.rowCount === 1) {
      console.log("관리자 비밀번호가 성공적으로 재설정되었습니다.");
      console.log(`새 비밀번호: ${newPassword}`);
    } else {
      console.log("관리자 계정을 찾을 수 없습니다.");
    }
  } catch (err) {
    console.error("비밀번호 재설정 중 오류 발생:", err);
  } finally {
    await pool.end();
  }
}

resetAdminPassword();