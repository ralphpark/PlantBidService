import { 
  users, plants, vendors, bids, conversations, products, storeLocations, payments, orders, notifications, siteSettings, aiSettings, passwordResetTokens,
  type User, type InsertUser, 
  type Plant, type InsertPlant,
  type Vendor, type InsertVendor,
  type Bid, type InsertBid,
  type Conversation, type InsertConversation,
  type Product, type InsertProduct,
  type StoreLocation, type InsertStoreLocation,
  type Payment, type InsertPayment,
  type Order, type InsertOrder,
  type Notification, type InsertNotification,
  type AISettings, type InsertAISettings,
  type PasswordResetToken, type InsertPasswordResetToken
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, isNull, notInArray, or, inArray, sql, not } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

// Storage interface for the application
export interface IStorage {
  // Session store
  sessionStore: session.Store;
  
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  getUserByBusinessNumber(businessNumber: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  updateUserPassword(id: number, hashedPassword: string): Promise<User | undefined>;
  
  // Password reset token methods
  createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markTokenAsUsed(token: string): Promise<void>;
  deleteExpiredTokens(): Promise<void>;
  
  // Plant methods
  getPlant(id: number): Promise<Plant | undefined>;
  getAllPlants(): Promise<Plant[]>;
  createPlant(plant: InsertPlant): Promise<Plant>;
  addPlant(plant: InsertPlant): Promise<Plant>;
  updatePlant(id: number, plantData: Partial<Plant>): Promise<Plant | undefined>;
  deletePlant(id: number): Promise<void>;
  removeAllPlants(): Promise<void>;
  insertMultiplePlants(plantsData: any[]): Promise<void>;
  
  // Vendor methods
  getVendor(id: number): Promise<Vendor | undefined>;
  getVendorById(id: number): Promise<Vendor | undefined>;
  getVendorByUserId(userId: number): Promise<Vendor | undefined>;
  getVendorsByStoreName(storeName: string): Promise<Vendor[]>;
  getAllVendors(): Promise<Vendor[]>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  
  // Payment methods
  getPayment(id: number): Promise<Payment | undefined>;
  getPaymentByOrderId(orderId: string): Promise<Payment | undefined>;
  getPaymentByPaymentKey(paymentKey: string): Promise<Payment | undefined>;
  getPaymentByKey(paymentKey: string): Promise<Payment | undefined>; // Alias for getPaymentByPaymentKey
  getPaymentsForUser(userId: number): Promise<Payment[]>;
  getPaymentsForVendor(vendorId: number): Promise<Payment[]>; // New method to get payments for a specific vendor
  getPaymentsForBid(bidId: number): Promise<Payment[]>;
  getAllPayments(): Promise<Payment[]>; // 모든 결제 정보 가져오기
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePaymentStatus(id: number, status: string, paymentKey?: string): Promise<Payment | undefined>;
  updatePayment(id: number, paymentData: Partial<Payment>): Promise<Payment | undefined>;
  updatePaymentByOrderId(orderId: string, paymentData: Partial<Payment>): Promise<Payment | undefined>;
  fixPaymentBidId(paymentId: number, orderId: string): Promise<Payment | undefined>;
  
  // Order methods
  getOrder(id: number): Promise<Order | undefined>;
  getOrderByOrderId(orderId: string): Promise<Order | undefined>;
  getOrdersForUser(userId: number): Promise<Order[]>;
  getOrdersForVendor(vendorId: number): Promise<Order[]>;
  getAllOrders(): Promise<Order[]>; // 모든 주문 가져오기
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: number, status: string): Promise<Order | undefined>;
  updateOrderStatusByOrderId(orderId: string, status: string): Promise<Order | undefined>;
  
  // Site Settings methods
  getSiteSettings(): Promise<any | undefined>;
  updateSiteSettings(settings: { homePage?: string }): Promise<void>;
  updateOrder(id: number, orderData: Partial<Order>): Promise<Order | undefined>;
  
  // Bid methods
  getBid(id: number): Promise<Bid | undefined>;
  getBidById(id: number): Promise<Bid | undefined>; // Alias for getBid for compatibility
  getBidsForUser(userId: number): Promise<Bid[]>;
  getBidsForPlant(plantId: number): Promise<Bid[]>;
  getBidsForVendor(vendorId: number): Promise<Bid[]>;
  createBid(bid: InsertBid): Promise<Bid>;
  updateBidStatus(id: number, status: string): Promise<Bid | undefined>;
  updateBid(id: number, bidData: Partial<Bid>): Promise<Bid | undefined>;
  
  // Conversation methods
  getConversation(id: number): Promise<Conversation | undefined>;
  getConversationsForUser(userId: number): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: number, messages: any[], recommendations?: any[]): Promise<Conversation | undefined>;
  updateConversationData(id: number, data: Partial<Conversation>): Promise<Conversation | undefined>;
  addMessageToConversation(conversationId: number, message: any): Promise<boolean>;
  
  // Product methods
  getProduct(id: number): Promise<Product | undefined>;
  getProductsForUser(userId: number): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<Product>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;
  
  // Store Location methods
  getStoreLocation(id: number): Promise<StoreLocation | undefined>;
  getStoreLocationForUser(userId: number): Promise<StoreLocation | undefined>;
  createStoreLocation(location: InsertStoreLocation): Promise<StoreLocation>;
  updateStoreLocation(id: number, location: Partial<StoreLocation>): Promise<StoreLocation | undefined>;
  
  // Notification methods
  getNotification(id: number): Promise<Notification | undefined>;
  getNotificationsForUser(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  updateNotification(id: number, notificationData: Partial<Notification>): Promise<Notification | undefined>;
  markNotificationAsRead(id: number): Promise<Notification | undefined>;
  
  // Bid methods for conversation
  getBidsForConversation(conversationId: number): Promise<Bid[]>;
  
  // AI Settings methods
  getAISettings(): Promise<AISettings | undefined>;
  updateAISettings(settings: Partial<InsertAISettings>): Promise<AISettings | undefined>;
}

// Database implementation of the storage interface
export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }
  
  // Payment methods
  async getPayment(id: number): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment;
  }

  async getPaymentByOrderId(orderId: string): Promise<Payment | undefined> {
    try {
      console.log('주문 ID로 결제 정보 조회:', orderId);
      const [payment] = await db.select().from(payments).where(eq(payments.orderId, orderId));
      if (payment) {
        console.log('결제 정보 발견:', payment.id, payment.status);
      } else {
        console.log('주문에 대한 결제 정보가 없음:', orderId);
      }
      return payment;
    } catch (error) {
      console.error('주문 ID로 결제 정보 조회 오류:', error);
      return undefined;
    }
  }

  async getPaymentByPaymentKey(paymentKey: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.paymentKey, paymentKey));
    return payment;
  }
  
  // 별칭 - portone-v2-routes.ts에서 사용
  async getPaymentByKey(paymentKey: string): Promise<Payment | undefined> {
    return this.getPaymentByPaymentKey(paymentKey);
  }

  async getPaymentsForUser(userId: number): Promise<Payment[]> {
    return db.select().from(payments).where(eq(payments.userId, userId)).orderBy(desc(payments.createdAt));
  }

  async getPaymentsForBid(bidId: number): Promise<Payment[]> {
    return db.select().from(payments).where(eq(payments.bidId, bidId)).orderBy(desc(payments.createdAt));
  }
  
  // 모든 결제 정보 조회
  async getAllPayments(): Promise<any[]> {
    try {
      console.log('모든 결제 정보 조회 시작');
      
      // payments와 bids, users, plants, vendors 테이블을 조인하여 실제 거래 금액과 관련 정보를 함께 조회
      const paymentsWithDetails = await db
        .select({
          id: payments.id,
          amount: payments.amount,
          status: payments.status,
          orderId: payments.orderId,
          createdAt: payments.createdAt,
          userId: payments.userId,
          bidId: payments.bidId,
          // bids 테이블에서 실제 거래 금액과 관련 정보
          actualAmount: bids.price,
          plantId: bids.plantId,
          vendorId: bids.vendorId,
          // users 테이블에서 고객 정보
          customerName: users.username,
          customerEmail: users.email,
          // plants 테이블에서 상품 정보
          productName: plants.name,
          // vendors 테이블에서 판매자 정보
          vendorName: vendors.storeName
        })
        .from(payments)
        .leftJoin(bids, eq(payments.bidId, bids.id))
        .leftJoin(users, eq(payments.userId, users.id))
        .leftJoin(plants, eq(bids.plantId, plants.id))
        .leftJoin(vendors, eq(bids.vendorId, vendors.id))
        .orderBy(desc(payments.createdAt));
      
      // payments 테이블의 amount를 우선 사용하고, 0원인 경우에만 actualAmount 사용
      const enrichedPayments = paymentsWithDetails.map(payment => ({
        ...payment,
        displayAmount: (payment.amount && payment.amount !== '0.00') ? payment.amount : payment.actualAmount,
        isZeroAmount: payment.amount === '0.00' || payment.amount === '0',
        orderDate: payment.createdAt
      }));
      
      console.log(`모든 결제 정보 조회 완료: ${enrichedPayments.length}개`);
      console.log(`0원 결제 건수: ${enrichedPayments.filter(p => p.isZeroAmount).length}개`);
      
      return enrichedPayments;
    } catch (error) {
      console.error('모든 결제 정보 조회 오류:', error);
      return [];
    }
  }
  
  /**
   * 판매자 ID와 대화 ID를 기반으로 입찰 정보를 찾는 메서드 (상세 로깅 버전)
   * 결제 정보와 올바른 판매자를 연결하기 위해 사용됩니다.
   * @param vendorId 판매자 ID
   * @param conversationId 대화 ID
   * @returns 찾은 입찰 정보 또는 undefined
   */
  async getBidByVendorAndConversationDetailed(vendorId: number, conversationId: number): Promise<Bid | undefined> {
    try {
      console.log(`판매자 ${vendorId}와 대화 ${conversationId}에 대한 입찰 검색 중...`);
      
      // 판매자 ID와 대화 ID를 모두 만족하는 입찰 찾기
      const [bid] = await db
        .select()
        .from(bids)
        .where(
          and(
            eq(bids.vendorId, vendorId),
            eq(bids.conversationId, conversationId)
          )
        )
        .orderBy(desc(bids.createdAt))
        .limit(1);
      
      if (bid) {
        console.log(`✅ 판매자 ${vendorId}와 대화 ${conversationId}에 대한 입찰 찾음: ID=${bid.id}`);
      } else {
        console.log(`⚠️ 판매자 ${vendorId}와 대화 ${conversationId}에 대한 입찰을 찾지 못함`);
      }
      
      return bid;
    } catch (error) {
      console.error(`판매자 ${vendorId}와 대화 ${conversationId}에 대한 입찰 검색 중 오류:`, error);
      return undefined;
    }
  }

  async getPaymentsForVendor(vendorId: number): Promise<Payment[]> {
    // 더 명확한 디버그 정보 출력
    console.log(`[DEBUG] ====== 판매자 ${vendorId}의 결제 내역 조회 시작 ======`);
    
    try {
      // 먼저 이 판매자와 동일한 사용자 ID를 가진 모든 판매자 ID 목록 조회
      const relatedVendor = await db.select().from(vendors).where(eq(vendors.id, vendorId)).limit(1);
      
      if (relatedVendor.length === 0) {
        console.log(`[DEBUG] 판매자 ID ${vendorId}에 해당하는 판매자 정보를 찾을 수 없습니다.`);
        return [];
      }
      
      const userId = relatedVendor[0].userId;
      console.log(`[DEBUG] 판매자 ID ${vendorId}의 사용자 ID: ${userId}`);
      
      // 동일한 사용자 ID를 가진 모든 판매자 ID 목록 조회
      const allVendorIds = await db
        .select({ id: vendors.id, storeName: vendors.storeName })
        .from(vendors)
        .where(eq(vendors.userId, userId));
      
      const vendorIds = allVendorIds.map(v => v.id);
      console.log(`[DEBUG] 사용자 ID ${userId}에 연결된 모든 판매자 ID: ${vendorIds.join(', ')}`);
      
      // 모든 판매자 ID에 대한 주문 조회
      const vendorOrders = await db
        .select({ orderId: orders.orderId })
        .from(orders)
        .where(and(
          inArray(orders.vendorId, vendorIds),
          or(
            eq(orders.status, 'paid'),
            eq(orders.status, 'completed'),
            eq(orders.status, 'cancelled')
          )
        ));
      
      const vendorOrderIds = vendorOrders.map(order => order.orderId);
      console.log(`[DEBUG] 모든 연결된 판매자의 결제 가능한 주문 ID 목록: ${vendorOrderIds.length}개`);
      console.log(`[DEBUG] 주문 ID 목록: ${vendorOrderIds.join(', ')}`);
      
      // 주문이 없으면 빈 배열 반환
      if (vendorOrderIds.length === 0) {
        console.log(`[DEBUG] 연결된 판매자의 결제 가능한 주문이 없습니다. 빈 결제 내역 반환.`);
        return [];
      }
      
      // 이 주문 ID로 payments 테이블 필터링 - 모든 결제 상태 포함
      const vendorPayments = await db
        .select()
        .from(payments)
        .where(inArray(payments.orderId, vendorOrderIds))
        .orderBy(desc(payments.createdAt));
      
      console.log(`[DEBUG] 모든 연결된 판매자의 결제 내역: ${vendorPayments.length}개 조회됨`);
      
      // 결제 내역의 첫 번째와 마지막 항목 로깅 (디버깅용)
      if (vendorPayments.length > 0) {
        console.log(`[DEBUG] 최근 결제: ${vendorPayments[0].orderId}, 금액: ${vendorPayments[0].amount}, 상태: ${vendorPayments[0].status}`);
        if (vendorPayments.length > 1) {
          const lastPayment = vendorPayments[vendorPayments.length - 1];
          console.log(`[DEBUG] 가장 오래된 결제: ${lastPayment.orderId}, 금액: ${lastPayment.amount}, 상태: ${lastPayment.status}`);
        }
      }
      
      console.log(`[DEBUG] ====== 판매자 ${vendorId}의 결제 내역 조회 완료 ======`);
      return vendorPayments;
    } catch (error) {
      console.error(`[ERROR] 판매자 ${vendorId}의 결제 내역 조회 중 오류 발생:`, error);
      return [];
    }
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    // 결제키 형식 검증 및 변환
    if (payment.paymentKey && typeof payment.paymentKey === 'string') {
      // 이미 pay_ 형식이고 26자인 경우 그대로 사용
      if (payment.paymentKey.startsWith('pay_') && payment.paymentKey.length === 26) {
        console.log(`결제 키가 이미 올바른 포트원 V2 API 형식임: ${payment.paymentKey}`);
      } 
      // UUID 또는 다른 형식인 경우 변환
      else {
        try {
          // convertToV2PaymentId 함수 호출을 위한 import
          const { convertToV2PaymentId, generatePortonePaymentId } = require('./portone-v2-client');
          
          // UUID 형식인 경우
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payment.paymentKey)) {
            const originalKey = payment.paymentKey;
            payment.paymentKey = convertToV2PaymentId(payment.paymentKey);
            console.log(`UUID를 V2 형식으로 변환: ${originalKey} → ${payment.paymentKey}`);
          }
          // 그 외 형식이거나 paymentKey가 없는 경우
          else if (!payment.paymentKey) {
            payment.paymentKey = generatePortonePaymentId();
            console.log(`새로운 결제 ID 생성: ${payment.paymentKey}`);
          }
        } catch (error) {
          console.error('결제 ID 변환 중 오류:', error);
          // 오류 발생 시 기본 형식으로 생성
          payment.paymentKey = `pay_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`.substring(0, 26);
          console.log(`오류 발생으로 대체 결제 ID 생성: ${payment.paymentKey}`);
        }
      }
    }
    
    // 최종 검증: paymentKey가 없거나 올바른 형식이 아닌 경우 생성
    if (!payment.paymentKey || !payment.paymentKey.startsWith('pay_') || payment.paymentKey.length !== 26) {
      try {
        const { generatePortonePaymentId } = require('./portone-v2-client');
        payment.paymentKey = generatePortonePaymentId();
        console.log(`최종 검증에서 결제 ID 재생성: ${payment.paymentKey}`);
      } catch (error) {
        // 오류 시 기본 형식으로 간단히 생성
        const prefix = 'pay_';
        const randomPart = Date.now().toString(36) + Math.random().toString(36).substring(2);
        payment.paymentKey = prefix + randomPart.replace(/[^a-zA-Z0-9]/g, '').substring(0, 22);
        console.log(`최종 기본 결제 ID 생성: ${payment.paymentKey}`);
      }
    }
    
    // 데이터베이스에 저장
    const [newPayment] = await db.insert(payments).values(payment).returning();
    return newPayment;
  }

  async updatePayment(id: number, paymentData: Partial<Payment>): Promise<Payment | undefined> {
    try {
      // 업데이트 날짜 추가
      const updateData = {
        ...paymentData,
        updatedAt: new Date()
      };
      
      // receipt가 객체인 경우 JSON으로 변환
      if (updateData.receipt && typeof updateData.receipt === 'object') {
        updateData.receipt = JSON.stringify(updateData.receipt);
      }
      
      const [updatedPayment] = await db
        .update(payments)
        .set(updateData)
        .where(eq(payments.id, id))
        .returning();
      
      // receipt가 JSON 문자열인 경우 객체로 파싱
      if (updatedPayment.receipt && typeof updatedPayment.receipt === 'string') {
        try {
          (updatedPayment as any).receipt = JSON.parse(updatedPayment.receipt);
        } catch (e) {
          console.error("영수증 데이터 파싱 오류:", e);
          (updatedPayment as any).receipt = {};
        }
      }
      
      return updatedPayment;
    } catch (error) {
      console.error("결제 정보 업데이트 오류:", error);
      return undefined;
    }
  }
  
  async updatePaymentStatus(id: number, status: string, paymentKey?: string): Promise<Payment | undefined> {
    try {
      // 업데이트할 데이터 준비
      const updateData: Partial<Payment> = {
        status,
        updatedAt: new Date()
      };
      
      // paymentKey가 제공된 경우 추가
      if (paymentKey) {
        updateData.paymentKey = paymentKey;
      }
      
      // 결제 상태 업데이트
      const [updatedPayment] = await db
        .update(payments)
        .set(updateData)
        .where(eq(payments.id, id))
        .returning();
      
      console.log(`결제 ID ${id}의 상태가 '${status}'로 업데이트되었습니다.`);
      return updatedPayment;
    } catch (error) {
      console.error(`결제 상태 업데이트 오류 (ID: ${id}, 상태: ${status}):`, error);
      return undefined;
    }
  }

  // 주문 ID로 결제 정보 업데이트
  async updatePaymentByOrderId(orderId: string, paymentData: Partial<Payment>): Promise<Payment | undefined> {
    try {
      // 먼저 해당 주문 ID로 결제 정보 조회
      const payment = await this.getPaymentByOrderId(orderId);
      if (!payment) {
        console.error(`주문 ID ${orderId}에 대한 결제 정보를 찾을 수 없습니다.`);
        return undefined;
      }
      
      // paymentKey 형식 검증 및 변환
      if (paymentData.paymentKey && typeof paymentData.paymentKey === 'string') {
        // 이미 pay_ 형식이고 26자인 경우 그대로 사용
        if (paymentData.paymentKey.startsWith('pay_') && paymentData.paymentKey.length === 26) {
          console.log(`결제 키가 이미 올바른 포트원 V2 API 형식임: ${paymentData.paymentKey}`);
        } 
        // UUID 또는 다른 형식인 경우 변환
        else {
          try {
            // convertToV2PaymentId 함수 호출을 위한 import
            const { convertToV2PaymentId, generatePortonePaymentId } = require('./portone-v2-client');
            
            // UUID 형식인 경우
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paymentData.paymentKey)) {
              const originalKey = paymentData.paymentKey;
              paymentData.paymentKey = convertToV2PaymentId(paymentData.paymentKey);
              console.log(`UUID를 V2 형식으로 변환: ${originalKey} → ${paymentData.paymentKey}`);
            }
            // 그 외 형식인 경우 새 ID 생성
            else {
              const originalKey = paymentData.paymentKey;
              paymentData.paymentKey = generatePortonePaymentId();
              console.log(`비표준 결제 ID를 새 ID로 변환: ${originalKey} → ${paymentData.paymentKey}`);
            }
          } catch (error) {
            console.error('결제 ID 변환 중 오류:', error);
            // 오류 발생 시 기본 형식으로 생성
            paymentData.paymentKey = `pay_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`.substring(0, 26);
            console.log(`오류 발생으로 대체 결제 ID 생성: ${paymentData.paymentKey}`);
          }
        }
      }
      
      // 결제 ID로 업데이트 수행
      return this.updatePayment(payment.id, paymentData);
    } catch (error) {
      console.error(`주문 ID ${orderId}로 결제 정보 업데이트 오류:`, error);
      return undefined;
    }
  }
  
  /**
   * 결제 데이터의 bid_id를 수정하여 올바른 판매자와 연결
   * 이 메서드는 기존 잘못된 bid_id 참조를 수정하는데 사용됩니다.
   * @param paymentId 업데이트할 결제 ID
   * @param orderId 연결된 주문 ID
   */
  async fixPaymentBidId(paymentId: number, orderId: string): Promise<Payment | undefined> {
    try {
      console.log(`결제 ID ${paymentId}의 bid_id 수정 시도 (주문 ID: ${orderId})`);
      
      // 1. 결제 정보 조회
      const payment = await this.getPayment(paymentId);
      if (!payment) {
        console.error(`결제 ID ${paymentId}를 찾을 수 없습니다.`);
        return undefined;
      }
      
      // 2. 주문 정보 조회
      const order = await this.getOrderByOrderId(orderId);
      if (!order) {
        console.error(`주문 ID ${orderId}를 찾을 수 없습니다.`);
        return undefined;
      }
      
      // 3. 주문 정보에서 판매자 ID와 대화 ID 가져오기
      const vendorId = order.vendorId;
      const conversationId = order.conversationId;
      
      if (!vendorId || !conversationId) {
        console.error(`주문에 필요한 정보가 없습니다: vendorId=${vendorId}, conversationId=${conversationId}`);
        return undefined;
      }
      
      // 4. 판매자 ID와 대화 ID로 올바른 입찰 ID 찾기
      const correctBid = await this.getBidByVendorAndConversation(vendorId, conversationId);
      if (!correctBid) {
        console.error(`판매자 ID ${vendorId}와 대화 ID ${conversationId}에 해당하는 입찰 정보를 찾을 수 없습니다.`);
        return undefined;
      }
      
      console.log(`올바른 입찰 정보 찾음: ID=${correctBid.id}, 판매자=${vendorId}, 대화=${conversationId}`);
      
      // 5. 결제 정보의 bid_id 필드 업데이트
      const updatedPayment = await this.updatePayment(paymentId, {
        bidId: correctBid.id
      });
      
      if (updatedPayment) {
        console.log(`결제 ID ${paymentId}의 bid_id가 ${payment.bidId}에서 ${correctBid.id}로 수정되었습니다.`);
      }
      
      return updatedPayment;
    } catch (error) {
      console.error('결제 정보 수정 중 오류:', error);
      return undefined;
    }
  }







  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  
  async getUserByPhone(phone: string): Promise<User | undefined> {
    // 전화번호는 다양한 형식으로 저장될 수 있으므로 정규화된 형식만 비교
    // 예: 010-1234-5678, 01012345678, +82 10-1234-5678
    // 숫자만 추출하여 비교
    const normalizedPhone = phone.replace(/[^0-9]/g, '');
    const allUsers = await db.select().from(users);
    
    // 각 사용자의 전화번호에서 숫자만 추출하여 비교
    return allUsers.find(user => {
      if (!user.phone) return false;
      const userNormalizedPhone = user.phone.replace(/[^0-9]/g, '');
      return userNormalizedPhone === normalizedPhone;
    });
  }
  
  async getUserByBusinessNumber(businessNumber: string): Promise<User | undefined> {
    // 사업자 번호도 다양한 형식으로 저장될 수 있으므로 정규화된 형식만 비교
    // 예: 123-45-67890, 1234567890
    const normalizedBusinessNumber = businessNumber.replace(/[^0-9]/g, '');
    const allUsers = await db.select().from(users);
    
    // 각 사용자의 사업자 번호에서 숫자만 추출하여 비교
    return allUsers.find(user => {
      if (!user.businessNumber) return false;
      const userNormalizedBusinessNumber = user.businessNumber.replace(/[^0-9]/g, '');
      return userNormalizedBusinessNumber === normalizedBusinessNumber;
    });
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    try {
      // 업데이트 날짜 추가
      const updateData = {
        ...userData,
        updatedAt: new Date()
      };
      
      // 사용자 정보 업데이트
      const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, id))
        .returning();
      
      console.log(`사용자 ID ${id} 정보가 업데이트되었습니다:`, updatedUser);
      return updatedUser;
    } catch (error) {
      console.error(`사용자 ID ${id} 정보 업데이트 실패:`, error);
      return undefined;
    }
  }
  
  async updateUserPassword(id: number, hashedPassword: string): Promise<User | undefined> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set({ 
          password: hashedPassword,
          updatedAt: new Date()
        })
        .where(eq(users.id, id))
        .returning();
      
      console.log(`사용자 ID ${id}의 비밀번호가 변경되었습니다`);
      return updatedUser;
    } catch (error) {
      console.error(`사용자 ID ${id} 비밀번호 변경 실패:`, error);
      return undefined;
    }
  }

  // Password reset token methods
  async createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const [resetToken] = await db.insert(passwordResetTokens).values(token).returning();
    console.log(`비밀번호 재설정 토큰 생성: 사용자 ID ${token.userId}`);
    return resetToken;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
    return resetToken;
  }

  async markTokenAsUsed(token: string): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.token, token));
    console.log(`비밀번호 재설정 토큰 사용됨: ${token}`);
  }

  async deleteExpiredTokens(): Promise<void> {
    const now = new Date();
    await db
      .delete(passwordResetTokens)
      .where(sql`${passwordResetTokens.expiresAt} < ${now}`);
    console.log(`만료된 비밀번호 재설정 토큰 삭제 완료`);
  }

  // Plant methods
  async getPlant(id: number): Promise<Plant | undefined> {
    const [rawPlant] = await db.select().from(plants).where(eq(plants.id, id));
    if (!rawPlant) return undefined;
    
    // snake_case를 camelCase로 변환하여 반환
    return {
      ...rawPlant,
      scientificName: rawPlant.scientificName || (rawPlant as any).scientific_name || '',
      priceRange: rawPlant.priceRange || (rawPlant as any).price_range || '',
      waterNeeds: rawPlant.waterNeeds || (rawPlant as any).water_needs || '',
      careInstructions: rawPlant.careInstructions || (rawPlant as any).care_instructions || '',
      imageUrl: rawPlant.imageUrl || (rawPlant as any).image_url || '',
      colorFeature: rawPlant.colorFeature || (rawPlant as any).color_feature || '',
      plantType: rawPlant.plantType || (rawPlant as any).plant_type || '',
      hasThorns: rawPlant.hasThorns || (rawPlant as any).has_thorns || false,
      leafShape1: rawPlant.leafShape1 || (rawPlant as any).leaf_shape1 || '',
      leafShape2: rawPlant.leafShape2 || (rawPlant as any).leaf_shape2 || '',
      leafShape3: rawPlant.leafShape3 || (rawPlant as any).leaf_shape3 || '',
      leafShape4: rawPlant.leafShape4 || (rawPlant as any).leaf_shape4 || '',
      experienceLevel: rawPlant.experienceLevel || (rawPlant as any).experience_level || '',
      petSafety: rawPlant.petSafety || (rawPlant as any).pet_safety || '',
      winterTemperature: rawPlant.winterTemperature || (rawPlant as any).winter_temperature || ''
    };
  }

  async getAllPlants(): Promise<Plant[]> {
    // 데이터베이스에서 raw 데이터를 가져와서 필드명을 올바르게 매핑
    const rawPlants = await db.select().from(plants);
    
    // 중복 제거: 동일한 이름의 식물이 여러 개 있을 경우 완전한 데이터가 있는 것을 우선 선택
    const plantMap = new Map<string, any>();
    
    rawPlants.forEach(plant => {
      const plantName = plant.name.toLowerCase().trim();
      const existingPlant = plantMap.get(plantName);
      
      // 현재 식물이 더 완전한 데이터를 가지고 있는지 확인
      const hasCompleteData = plant.category || plant.difficulty || plant.light || (plant as any).water_needs;
      const existingHasCompleteData = existingPlant ? (existingPlant.category || existingPlant.difficulty || existingPlant.light || existingPlant.water_needs) : false;
      
      // 기존 데이터가 없거나, 현재 데이터가 더 완전하면 교체
      if (!existingPlant || (hasCompleteData && !existingHasCompleteData)) {
        plantMap.set(plantName, plant);
      }
    });
    
    // Map에서 값들을 배열로 변환하고 snake_case를 camelCase로 변환하여 반환
    return Array.from(plantMap.values()).map(plant => ({
      ...plant,
      scientificName: plant.scientificName || (plant as any).scientific_name || '',
      priceRange: plant.priceRange || (plant as any).price_range || '',
      waterNeeds: plant.waterNeeds || (plant as any).water_needs || '',
      careInstructions: plant.careInstructions || (plant as any).care_instructions || '',
      imageUrl: plant.imageUrl || (plant as any).image_url || '',
      colorFeature: plant.colorFeature || (plant as any).color_feature || '',
      plantType: plant.plantType || (plant as any).plant_type || '',
      hasThorns: plant.hasThorns || (plant as any).has_thorns || false,
      leafShape1: plant.leafShape1 || (plant as any).leaf_shape1 || '',
      leafShape2: plant.leafShape2 || (plant as any).leaf_shape2 || '',
      leafShape3: plant.leafShape3 || (plant as any).leaf_shape3 || '',
      leafShape4: plant.leafShape4 || (plant as any).leaf_shape4 || '',
      experienceLevel: plant.experienceLevel || (plant as any).experience_level || '',
      petSafety: plant.petSafety || (plant as any).pet_safety || '',
      winterTemperature: plant.winterTemperature || (plant as any).winter_temperature || ''
    }));
  }

  // 식물명으로 검색 (유사 매칭 포함)
  async getPlantByName(plantName: string): Promise<Plant | undefined> {
    const allPlants = await this.getAllPlants();
    
    // 1차: 정확한 매칭
    let matchingPlant = allPlants.find(p => 
      p.name.toLowerCase() === plantName.toLowerCase()
    );
    
    if (matchingPlant) {
      console.log(`식물명 정확 매칭 성공: "${plantName}" → "${matchingPlant.name}" (ID: ${matchingPlant.id})`);
      return matchingPlant;
    }
    
    // 2차: 부분 매칭 (plantName이 DB 식물명에 포함되는 경우)
    matchingPlant = allPlants.find(p => 
      p.name.toLowerCase().includes(plantName.toLowerCase())
    );
    
    if (matchingPlant) {
      console.log(`식물명 부분 매칭 성공: "${plantName}" → "${matchingPlant.name}" (ID: ${matchingPlant.id})`);
      return matchingPlant;
    }
    
    // 3차: 역 부분 매칭 (DB 식물명이 plantName에 포함되는 경우)
    matchingPlant = allPlants.find(p => 
      plantName.toLowerCase().includes(p.name.toLowerCase())
    );
    
    if (matchingPlant) {
      console.log(`식물명 역 부분 매칭 성공: "${plantName}" → "${matchingPlant.name}" (ID: ${matchingPlant.id})`);
      return matchingPlant;
    }
    
    console.log(`식물명 매칭 실패: "${plantName}"`);
    return undefined;
  }

  async createPlant(plant: InsertPlant): Promise<Plant> {
    const [newPlant] = await db.insert(plants).values(plant).returning();
    return newPlant;
  }

  async addPlant(plant: InsertPlant): Promise<Plant> {
    return this.createPlant(plant);
  }

  async updatePlant(id: number, plantData: Partial<Plant>): Promise<Plant | undefined> {
    const [updatedPlant] = await db
      .update(plants)
      .set(plantData)
      .where(eq(plants.id, id))
      .returning();
    return updatedPlant;
  }

  async deletePlant(id: number): Promise<void> {
    await db.delete(plants).where(eq(plants.id, id));
  }

  // Vendor methods
  async getVendor(id: number): Promise<Vendor | undefined> {
    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, id));
    return vendor;
  }
  
  async getVendorById(id: number): Promise<Vendor | undefined> {
    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, id));
    return vendor;
  }
  
  async getVendorByUserId(userId: number): Promise<Vendor | undefined> {
    // 사용자 정보 확인
    const user = await this.getUser(userId);
    if (!user || user.role !== 'vendor') {
      console.log(`[오류] 사용자 ID ${userId}는 판매자가 아닙니다.`);
      return undefined;
    }
    
    // 1. 사용자 ID를 통해 직접 vendors 테이블에서 검색 (새로운 방식)
    console.log(`[검색] 사용자 ID ${userId}로 직접 판매자 정보 조회 중...`);
    const vendorList = await db.select().from(vendors).where(eq(vendors.userId, userId));
    
    if (vendorList.length) {
      console.log(`[성공] 사용자 ID ${userId}에 해당하는 판매자: ID ${vendorList[0].id}, 상호명 ${vendorList[0].storeName}`);
      return vendorList[0];
    }
    
    // 2. 이메일로 대체 검색 (기존 방식 - 폴백)
    console.log(`[대체 검색] 이메일 ${user.email}로 판매자 정보 조회 중...`);
    const emailVendorList = await db.select().from(vendors).where(eq(vendors.email, user.email));
    
    if (emailVendorList.length) {
      console.log(`[성공] 이메일 일치: 사용자 ID ${userId}에 해당하는 판매자: ID ${emailVendorList[0].id}, 상호명 ${emailVendorList[0].storeName}`);
      return emailVendorList[0];
    }
    
    // 3. 로그만 남기고 결과가 없음을 반환
    console.log(`[오류] 사용자 ID ${userId}, 이메일 ${user.email}에 해당하는 판매자 정보를 찾을 수 없습니다.`);
    return undefined;
  }

  async getVendorsByStoreName(storeName: string): Promise<Vendor[]> {
    const vendorUsers = await db.select().from(users)
      .where(and(
        eq(users.role, 'vendor'),
        eq(users.storeName, storeName)
      ));
    
    // 일치하는 사용자 ID 목록 추출
    const vendorIds = vendorUsers.map(user => user.id);
    
    if (vendorIds.length === 0) {
      return [];
    }
    
    // vendors 테이블에서 해당 ID를 가진 판매자 정보 가져오기
    const vendorsList = await Promise.all(
      vendorIds.map(async (id) => {
        const [vendor] = await db.select().from(vendors).where(eq(vendors.id, id));
        return vendor;
      })
    );
    
    // undefined 필터링
    return vendorsList.filter(Boolean);
  }

  async createVendor(vendor: InsertVendor): Promise<Vendor> {
    const [newVendor] = await db.insert(vendors).values(vendor).returning();
    return newVendor;
  }

  // Bid methods
  async getBid(id: number): Promise<Bid | undefined> {
    const [bid] = await db.select().from(bids).where(eq(bids.id, id));
    return bid;
  }
  
  // Alias for getBid for compatibility
  async getBidById(id: number): Promise<Bid | undefined> {
    return this.getBid(id);
  }

  async getBidsForUser(userId: number): Promise<Bid[]> {
    return db.select().from(bids).where(eq(bids.userId, userId)).orderBy(desc(bids.createdAt));
  }

  async getBidsForPlant(plantId: number): Promise<Bid[]> {
    return db.select().from(bids).where(eq(bids.plantId, plantId)).orderBy(desc(bids.createdAt));
  }

  async getBidsForVendor(vendorId: number): Promise<Bid[]> {
    return db.query.bids.findMany({
      where: eq(bids.vendorId, vendorId),
      orderBy: desc(bids.createdAt),
      with: {
        user: true,
        plant: true,
        conversation: true
      }
    });
  }
  
  async getAllVendors(): Promise<Vendor[]> {
    try {
      console.log('모든 판매자 정보 조회 시작');
      const allVendors = await db.select().from(vendors).orderBy(desc(vendors.createdAt));
      console.log(`모든 판매자 정보 조회 완료: ${allVendors.length}개`);
      return allVendors;
    } catch (error) {
      console.error('모든 판매자 정보 조회 오류:', error);
      return [];
    }
  }

  /**
   * 판매자ID와 대화ID로 입찰 정보 찾기
   * 특정 주문과 관련된 올바른 입찰 정보를 찾기 위해 사용
   */
  async getBidByVendorAndConversation(vendorId: number, conversationId: number): Promise<Bid | undefined> {
    const [bid] = await db.select()
      .from(bids)
      .where(
        and(
          eq(bids.vendorId, vendorId),
          eq(bids.conversationId, conversationId)
        )
      );
    return bid;
  }

  async createBid(bid: InsertBid): Promise<Bid> {
    const [newBid] = await db.insert(bids).values([bid] as any).returning();
    return newBid;
  }

  async updateBidStatus(id: number, status: string): Promise<Bid | undefined> {
    const [updatedBid] = await db
      .update(bids)
      .set({ status })
      .where(eq(bids.id, id))
      .returning();
    return updatedBid;
  }

  async updateBid(id: number, bidData: Partial<Bid>): Promise<Bid | undefined> {
    try {
      // JSON 필드는 문자열로 변환
      const updateData: any = {
        ...bidData
      };
      
      // referenceImages가 배열인 경우 JSON으로 변환
      if (Array.isArray(updateData.referenceImages)) {
        updateData.referenceImages = JSON.stringify(updateData.referenceImages);
      }
      
      console.log("입찰 업데이트 데이터:", updateData);
      
      const [updatedBid] = await db
        .update(bids)
        .set(updateData)
        .where(eq(bids.id, id))
        .returning();
      
      // 반환 시 JSON 문자열을 배열로 복원
      if (updatedBid.referenceImages && typeof updatedBid.referenceImages === 'string') {
        try {
          (updatedBid as any).referenceImages = JSON.parse(updatedBid.referenceImages);
        } catch (e) {
          console.error("참조 이미지 파싱 오류:", e);
          (updatedBid as any).referenceImages = [];
        }
      }
      
      return updatedBid;
    } catch (error) {
      console.error("입찰 업데이트 오류:", error);
      return undefined;
    }
  }

  // Conversation methods
  async getConversation(id: number): Promise<Conversation | undefined> {
    // 관계 쿼리 사용
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, id),
      with: {
        user: true,
        bids: true
      }
    });
    return conversation;
  }

  async getConversationsForUser(userId: number): Promise<Conversation[]> {
    return db.select().from(conversations).where(eq(conversations.userId, userId)).orderBy(desc(conversations.updatedAt));
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    try {
      // JSON 필드는 문자열로 변환
      const conversationData: any = {
        ...conversation
      };
      
      // messages가 배열인 경우 JSON 문자열로 변환
      if (Array.isArray(conversationData.messages)) {
        conversationData.messages = JSON.stringify(conversationData.messages);
      }
      
      // plantRecommendations가 배열인 경우 JSON 문자열로 변환
      if (Array.isArray(conversationData.plantRecommendations)) {
        conversationData.plantRecommendations = JSON.stringify(conversationData.plantRecommendations);
      }
      
      const [newConversation] = await db.insert(conversations)
        .values(conversationData)
        .returning();
      
      return newConversation;
    } catch (error) {
      console.error("대화 생성 오류:", error);
      throw error;
    }
  }

  async updateConversation(id: number, messages: any[], recommendations?: any[]): Promise<Conversation | undefined> {
    try {
      // 기존 대화를 먼저 가져옴
      const existingConversation = await this.getConversation(id);
      if (!existingConversation) {
        console.error(`대화 ID ${id}를 찾을 수 없습니다.`);
        return undefined;
      }

      // 기존 메시지와 새 메시지를 합침
      let allMessages: any[] = [];
      
      // 기존 메시지가 있으면 합침
      if (existingConversation.messages && Array.isArray(existingConversation.messages)) {
        allMessages = [...existingConversation.messages];
      }
      
      // 새 메시지가 있으면 추가 (기존 메시지를 유지하면서 중복 제거)
      if (messages && messages.length > 0) {
        // 더 정확한 중복 감지를 위한 필터링
        const newUniqueMessages = messages.filter(newMsg => {
          // 1. ID 기반 중복 검사
          if (newMsg.id && allMessages.some(existingMsg => existingMsg.id === newMsg.id)) {
            return false;
          }
          
          // 2. 내용과 역할 기반 중복 검사 (동일한 내용 + 같은 역할 + 비슷한 시간)
          const isDuplicate = allMessages.some(existingMsg => {
            // 동일한 역할과 내용을 가진 메시지가 이미 있는지 확인
            const sameRoleAndContent = 
              existingMsg.role === newMsg.role && 
              existingMsg.content === newMsg.content;
            
            // 중복으로 판단
            return sameRoleAndContent;
          });
          
          return !isDuplicate;
        });
        
        // 새 메시지 추가
        allMessages = [...allMessages, ...newUniqueMessages];
        
        console.log(`[대화 업데이트] ID ${id} - 기존 메시지 ${existingConversation.messages.length}개, 새 메시지 ${newUniqueMessages.length}개, 총 ${allMessages.length}개`);
      }
      
      // 시간순 정렬 (중복 대화 해결을 위한 추가 단계)
      allMessages.sort((a, b) => {
        const timeA = new Date(a.timestamp || 0).getTime();
        const timeB = new Date(b.timestamp || 0).getTime();
        return timeA - timeB;
      });
      
      // JSON 형식으로 메시지를 직접 설정
      const updateData: any = { 
        updatedAt: new Date()
      };
      
      // 결합된 메시지를 JSON으로 저장
      updateData.messages = JSON.stringify(allMessages);
      
      if (recommendations) {
        updateData.plantRecommendations = JSON.stringify(recommendations);
      }
      
      const [updatedConversation] = await db
        .update(conversations)
        .set(updateData)
        .where(eq(conversations.id, id))
        .returning();
        
      return updatedConversation;
    } catch (error) {
      console.error("대화 업데이트 오류:", error);
      return undefined;
    }
  }

  // Method to handle user request data updates
  async updateConversationData(id: number, data: Partial<Conversation>): Promise<Conversation | undefined> {
    try {
      const updateData = {
        ...data,
        updatedAt: new Date()
      };

      const [updatedConversation] = await db
        .update(conversations)
        .set(updateData)
        .where(eq(conversations.id, id))
        .returning();
        
      return updatedConversation;
    } catch (error) {
      console.error("대화 데이터 업데이트 오류:", error);
      return undefined;
    }
  }
  
  /**
   * 대화에 메시지 추가
   * @param conversationId 대화 ID
   * @param message 추가할 메시지 객체
   */
  async addMessageToConversation(conversationId: number, message: any): Promise<boolean> {
    try {
      // 대화 가져오기
      const conversation = await this.getConversation(conversationId);
      if (!conversation) {
        console.error(`대화 ID ${conversationId}를 찾을 수 없습니다.`);
        return false;
      }
      
      // 메시지 파싱
      let messages = [];
      try {
        // 메시지가 이미 JSON 문자열이 아닌 경우 예외 처리
        if (typeof conversation.messages === 'string') {
          messages = JSON.parse(conversation.messages);
        } else if (Array.isArray(conversation.messages)) {
          messages = conversation.messages;
        }
      } catch (parseError) {
        console.error("메시지 파싱 오류:", parseError);
        messages = [];
      }
      
      // 🚫 중복 입찰 검토 메시지 방지 로직
      if (message.role === 'vendor' && message.bidStatus === 'sent' && 
          message.content === '입찰내용을 검토중입니다') {
        
        // 같은 판매자의 기존 "검토중" 메시지가 있는지 확인
        const existingReviewMessage = messages.find(msg => 
          msg.role === 'vendor' && 
          msg.vendorId === message.vendorId && 
          msg.bidStatus === 'sent' && 
          msg.content === '입찰내용을 검토중입니다'
        );
        
        if (existingReviewMessage) {
          console.log(`[중복 방지] 판매자 ${message.vendorId}의 중복 "검토중" 메시지 차단됨`);
          return true; // 성공으로 처리하되 실제로는 추가하지 않음
        }
      }
      
      // 새 메시지 추가
      messages.push(message);
      
      // 대화 업데이트
      const updatedConversation = await this.updateConversation(conversationId, messages);
      
      return !!updatedConversation;
    } catch (error) {
      console.error(`대화 ${conversationId}에 메시지 추가 중 오류:`, error);
      return false;
    }
  }
  
  // 모든 대화의 메시지를 가져오는 함수
  async getAllMessages(): Promise<any[]> {
    try {
      // 모든 대화 조회
      const allConversations = await db.select().from(conversations);
      
      // 각 대화에서 메시지 추출하여 하나의 배열로 합치기
      let allMessages: any[] = [];
      
      for (const conversation of allConversations) {
        if (conversation.messages) {
          // 문자열로 저장된 메시지를 객체로 파싱
          let messages = [];
          try {
            if (typeof conversation.messages === 'string') {
              messages = JSON.parse(conversation.messages);
            } else if (Array.isArray(conversation.messages)) {
              messages = conversation.messages;
            }
          } catch (e) {
            console.error(`대화 ID ${conversation.id}의 메시지 파싱 오류:`, e);
            continue;
          }
          
          if (Array.isArray(messages) && messages.length > 0) {
            // 각 메시지에 대화 ID 추가
            const messagesWithContext = messages.map(msg => ({
              ...msg,
              conversationId: conversation.id
            }));
            allMessages = [...allMessages, ...messagesWithContext];
          }
        }
      }
      
      console.log(`모든 대화에서 총 ${allMessages.length}개의 메시지를 가져왔습니다.`);
      return allMessages;
    } catch (error) {
      console.error(`모든 메시지를 가져오는 중 오류 발생:`, error);
      return [];
    }
  }

  // Product methods
  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }
  
  async getAllProducts(): Promise<Product[]> {
    try {
      const allProducts = await db.select().from(products);
      console.log(`모든 제품 정보 조회 완료: ${allProducts.length}개`);
      return allProducts;
    } catch (error) {
      console.error('모든 제품 정보 조회 오류:', error);
      return [];
    }
  }

  async getProductsForUser(userId: number): Promise<Product[]> {
    return db.select().from(products)
      .where(eq(products.userId, userId))
      .orderBy(desc(products.updatedAt));
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: number, product: Partial<Product>): Promise<Product | undefined> {
    const updateData = {
      ...product,
      updatedAt: new Date()
    };
    
    const [updatedProduct] = await db
      .update(products)
      .set(updateData)
      .where(eq(products.id, id))
      .returning();
    
    return updatedProduct;
  }

  async deleteProduct(id: number): Promise<boolean> {
    const result = await db
      .delete(products)
      .where(eq(products.id, id))
      .returning();
    
    return result.length > 0;
  }

  // Store Location methods
  async getStoreLocation(id: number): Promise<StoreLocation | undefined> {
    const [location] = await db.select().from(storeLocations).where(eq(storeLocations.id, id));
    return location;
  }

  async getStoreLocationForUser(userId: number): Promise<StoreLocation | undefined> {
    const [location] = await db.select().from(storeLocations)
      .where(eq(storeLocations.userId, userId))
      .orderBy(desc(storeLocations.updatedAt))
      .limit(1);
    
    return location;
  }

  async createStoreLocation(location: InsertStoreLocation): Promise<StoreLocation> {
    // 기존 위치 정보가 있는지 확인 (한 사용자는 하나의 위치만 가질 수 있음)
    const existingLocation = await this.getStoreLocationForUser(location.userId);
    
    if (existingLocation) {
      // 기존 위치 정보가 있으면 업데이트
      return this.updateStoreLocation(existingLocation.id, location) as Promise<StoreLocation>;
    } else {
      // 새로운 위치 정보 생성
      const [newLocation] = await db.insert(storeLocations).values(location).returning();
      return newLocation;
    }
  }

  async updateStoreLocation(id: number, location: Partial<StoreLocation>): Promise<StoreLocation | undefined> {
    const updateData = {
      ...location,
      updatedAt: new Date()
    };
    
    const [updatedLocation] = await db
      .update(storeLocations)
      .set(updateData)
      .where(eq(storeLocations.id, id))
      .returning();
    
    return updatedLocation;
  }

  // Order methods
  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async getOrderByOrderId(orderId: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.orderId, orderId));
    return order;
  }
  


  async getOrdersForUser(userId: number): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
  }

  async getOrdersForVendor(vendorId: number): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.vendorId, vendorId)).orderBy(desc(orders.createdAt));
  }
  
  // 모든 주문 정보 조회
  async getAllOrders(): Promise<Order[]> {
    try {
      console.log('모든 주문 정보 조회 시작');
      const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
      console.log(`모든 주문 정보 조회 완료: ${allOrders.length}개`);
      return allOrders;
    } catch (error) {
      console.error('모든 주문 정보 조회 오류:', error);
      return [];
    }
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    return newOrder;
  }

  async updateOrderStatus(id: number, status: string): Promise<Order | undefined> {
    try {
      console.log(`[DB] 주문 상태 업데이트 시작 - ID: ${id}, 상태: ${status}`);
      
      // 업데이트 전 주문 상태 확인
      const [currentOrder] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, id));
      
      console.log(`[DB] 현재 주문 상태: ${currentOrder ? currentOrder.status : '없음'}`);
      
      // 주문 상태 업데이트
      const [updatedOrder] = await db
        .update(orders)
        .set({
          status,
          updatedAt: new Date()
        })
        .where(eq(orders.id, id))
        .returning();
      
      console.log(`[DB] 주문 ID ${id}의 상태가 '${currentOrder?.status || "알 수 없음"}'에서 '${updatedOrder?.status || status}'로 업데이트되었습니다.`);
      console.log(`[DB] 업데이트된 주문 정보:`, JSON.stringify(updatedOrder));
      
      // 다시 DB에서 확인
      const [verifiedOrder] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, id));
      
      console.log(`[DB] 저장 후 검증 - 주문 ID ${id}의 현재 상태: ${verifiedOrder ? verifiedOrder.status : '없음'}`);
      
      return updatedOrder;
    } catch (error) {
      console.error(`[DB] 주문 상태 업데이트 오류 (ID: ${id}, 상태: ${status}):`, error);
      return undefined;
    }
  }
  
  // 주문 ID로 주문 상태 업데이트
  async updateOrderStatusByOrderId(orderId: string, status: string): Promise<Order | undefined> {
    try {
      // 먼저 해당 주문 ID로 주문 정보 조회
      const order = await this.getOrderByOrderId(orderId);
      if (!order) {
        console.error(`주문 ID ${orderId}에 대한 주문 정보를 찾을 수 없습니다.`);
        return undefined;
      }
      
      console.log(`주문 상태 업데이트 시작: ID=${order.id}, orderId=${orderId}, 현재 상태=${order.status}, 새 상태=${status}`);
      
      // 주문 ID로 업데이트 수행
      const updatedOrder = await this.updateOrderStatus(order.id, status);
      
      // 업데이트 후 확인
      if (updatedOrder) {
        console.log(`주문 상태 업데이트 성공: ID=${order.id}, 이전=${order.status}, 현재=${updatedOrder.status}`);
      } else {
        console.error(`주문 상태 업데이트 실패: ID=${order.id}, 요청 상태=${status}`);
      }
      
      return updatedOrder;
    } catch (error) {
      console.error(`주문 ID ${orderId}로 주문 상태 업데이트 오류 (상태: ${status}):`, error);
      return undefined;
    }
  }

  async updateOrder(id: number, orderData: Partial<Order>): Promise<Order | undefined> {
    try {
      // 업데이트 날짜 추가
      const updateData = {
        ...orderData,
        updatedAt: new Date()
      };
      
      // JSON 필드 처리
      if (updateData.buyerInfo && typeof updateData.buyerInfo === 'object') {
        updateData.buyerInfo = JSON.stringify(updateData.buyerInfo);
      }
      
      if (updateData.recipientInfo && typeof updateData.recipientInfo === 'object') {
        updateData.recipientInfo = JSON.stringify(updateData.recipientInfo);
      }
      
      if (updateData.paymentInfo && typeof updateData.paymentInfo === 'object') {
        updateData.paymentInfo = JSON.stringify(updateData.paymentInfo);
      }
      
      if (updateData.trackingInfo && typeof updateData.trackingInfo === 'object') {
        updateData.trackingInfo = JSON.stringify(updateData.trackingInfo);
      }
      
      const [updatedOrder] = await db
        .update(orders)
        .set(updateData)
        .where(eq(orders.id, id))
        .returning();
      
      // JSON 문자열을 객체로 파싱
      const parseJsonField = (field: any) => {
        if (field && typeof field === 'string') {
          try {
            return JSON.parse(field);
          } catch (e) {
            console.error("JSON 파싱 오류:", e);
            return {};
          }
        }
        return field;
      };
      
      updatedOrder.buyerInfo = parseJsonField(updatedOrder.buyerInfo);
      updatedOrder.recipientInfo = parseJsonField(updatedOrder.recipientInfo);
      updatedOrder.paymentInfo = parseJsonField(updatedOrder.paymentInfo);
      updatedOrder.trackingInfo = parseJsonField(updatedOrder.trackingInfo);
      
      return updatedOrder;
    } catch (error) {
      console.error("주문 업데이트 오류:", error);
      return undefined;
    }
  }
  
  // Notification methods
  async getNotification(id: number): Promise<Notification | undefined> {
    const [notification] = await db.select().from(notifications).where(eq(notifications.id, id));
    return notification;
  }

  async getNotificationsForUser(userId: number): Promise<Notification[]> {
    return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async updateNotification(id: number, notificationData: Partial<Notification>): Promise<Notification | undefined> {
    try {
      const [updatedNotification] = await db
        .update(notifications)
        .set(notificationData)
        .where(eq(notifications.id, id))
        .returning();
      
      return updatedNotification;
    } catch (error) {
      console.error("알림 업데이트 오류:", error);
      return undefined;
    }
  }

  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    try {
      const [updatedNotification] = await db
        .update(notifications)
        .set({
          status: 'read',
          readAt: new Date()
        })
        .where(eq(notifications.id, id))
        .returning();
      
      return updatedNotification;
    } catch (error) {
      console.error("알림 읽음 표시 오류:", error);
      return undefined;
    }
  }
  
  // Bid methods for conversation
  async getBidsForConversation(conversationId: number): Promise<Bid[]> {
    return db.select().from(bids).where(eq(bids.conversationId, conversationId)).orderBy(desc(bids.createdAt));
  }

  // Site Settings methods
  async getSiteSettings(): Promise<any | undefined> {
    try {
      const result = await db.select().from(siteSettings).limit(1);
      console.log("Storage - 사이트 설정 조회 결과:", JSON.stringify(result, null, 2));
      return result[0] || null;
    } catch (error) {
      console.error("사이트 설정 조회 오류:", error);
      return null;
    }
  }

  async updateSiteSettings(settings: { homePage?: string }): Promise<void> {
    try {
      // 기존 설정이 있는지 확인
      const existing = await db.select().from(siteSettings).limit(1);
      
      if (existing.length > 0) {
        // 기존 설정 업데이트
        await db.update(siteSettings)
          .set({ homePage: settings.homePage })
          .where(eq(siteSettings.id, existing[0].id));
      } else {
        // 새로운 설정 생성
        await db.insert(siteSettings).values({
          siteTitle: "PlantBid",
          siteDescription: "AI 기반 식물 추천 및 온라인 경매 플랫폼",
          homePage: settings.homePage
        });
      }
    } catch (error) {
      console.error("사이트 설정 업데이트 오류:", error);
      throw error;
    }
  }

  // AI Settings methods
  async getAISettings(): Promise<AISettings | undefined> {
    try {
      const [settings] = await db.select().from(aiSettings).limit(1);
      
      // 설정이 없으면 기본 설정 생성
      if (!settings) {
        console.log('AI 설정이 없어서 기본 설정을 생성합니다');
        const [newSettings] = await db.insert(aiSettings)
          .values({
            temperature: 0.7,
            maxOutputTokens: 2048,
            topK: 40,
            topP: 0.95,
            enableTracing: false,
            systemPrompt: '당신은 전문적인 식물 상담사입니다. 사용자의 질문에 친절하고 정확하게 답변해주세요.',
            plantRecommendationPrompt: '사용자의 환경과 선호도를 고려하여 최적의 식물을 추천해주세요.',
            vendorCommunicationPrompt: '업체와의 소통에서 전문적이고 친절한 톤을 유지해주세요.'
          })
          .returning();
        return newSettings;
      }
      
      return settings;
    } catch (error) {
      console.error('AI 설정 조회 오류:', error);
      throw error;
    }
  }

  async updateAISettings(settings: Partial<InsertAISettings>): Promise<AISettings | undefined> {
    try {
      console.log('AI 설정 업데이트:', settings);
      
      // 기존 설정 확인
      const existingSettings = await this.getAISettings();
      
      if (existingSettings) {
        // 기존 설정 업데이트
        const [updatedSettings] = await db.update(aiSettings)
          .set({
            ...settings,
            updatedAt: new Date()
          })
          .where(eq(aiSettings.id, existingSettings.id))
          .returning();
        
        console.log('AI 설정 업데이트 완료:', updatedSettings.id);
        return updatedSettings;
      } else {
        // 새로운 설정 생성
        const [newSettings] = await db.insert(aiSettings)
          .values(settings)
          .returning();
        
        console.log('새 AI 설정 생성 완료:', newSettings.id);
        return newSettings;
      }
    } catch (error) {
      console.error('AI 설정 업데이트 오류:', error);
      throw error;
    }
  }

  // 수수료 관리 관련 메서드들
  
  // 결제 완료된 주문 목록 조회 (매출 통계와 동일한 로직 사용)
  async getCompletedOrders(): Promise<any[]> {
    try {
      // 매출 통계에서 사용하는 것과 동일한 쿼리로 주문 조회
      const allOrders = await db
        .select({
          id: orders.id,
          orderId: sql<string>`COALESCE(${orders.orderId}, CAST(${orders.id} AS TEXT))`,
          amount: orders.price,
          vendorId: orders.vendorId,
          status: orders.status,
          createdAt: orders.createdAt,
          taxInvoiceIssued: sql<boolean>`false`, // 기본값
          transferCompleted: sql<boolean>`false`, // 기본값
        })
        .from(orders)
        .where(
          and(
            inArray(orders.status, ['paid', 'preparing', 'complete', 'delivered']),
            not(eq(orders.status, 'cancelled'))
          )
        )
        .orderBy(desc(orders.createdAt));

      console.log(`결제 완료 주문 ${allOrders.length}건 조회됨 (매출 통계 로직 사용)`);
      return allOrders;
    } catch (error) {
      console.error('결제 완료 주문 조회 오류:', error);
      // 오류 발생 시 빈 배열 반환
      return [];
    }
  }

  // 수수료율 업데이트
  async updateCommissionRate(rate: number): Promise<void> {
    try {
      console.log(`수수료율이 ${rate}%로 업데이트되었습니다`);
    } catch (error) {
      console.error('수수료율 업데이트 오류:', error);
      throw error;
    }
  }

  // 세금계산서 발행 표시
  async markTaxInvoiceIssued(orderId: string): Promise<void> {
    try {
      await db
        .update(payments)
        .set({ 
          taxInvoiceIssued: true,
          updatedAt: new Date()
        })
        .where(eq(payments.orderId, orderId));
      
      console.log(`주문 ${orderId}의 세금계산서 발행 표시 완료`);
    } catch (error) {
      console.error('세금계산서 발행 표시 오류:', error);
      throw error;
    }
  }

  // 송금 완료 표시
  async markTransferCompleted(orderId: string): Promise<void> {
    try {
      await db
        .update(payments)
        .set({ 
          transferCompleted: true,
          updatedAt: new Date()
        })
        .where(eq(payments.orderId, orderId));
      
      console.log(`주문 ${orderId}의 송금 완료 표시 완료`);
    } catch (error) {
      console.error('송금 완료 표시 오류:', error);
      throw error;
    }
  }

  // 일괄 세금계산서 발행 표시
  async bulkMarkTaxInvoiceIssued(orderIds: string[]): Promise<void> {
    try {
      await db
        .update(payments)
        .set({ 
          taxInvoiceIssued: true,
          updatedAt: new Date()
        })
        .where(inArray(payments.orderId, orderIds));
      
      console.log(`${orderIds.length}건의 세금계산서 발행 표시 완료`);
    } catch (error) {
      console.error('일괄 세금계산서 발행 표시 오류:', error);
      throw error;
    }
  }

  // 일괄 송금 완료 표시
  async bulkMarkTransferCompleted(orderIds: string[]): Promise<void> {
    try {
      await db
        .update(payments)
        .set({ 
          transferCompleted: true,
          updatedAt: new Date()
        })
        .where(inArray(payments.orderId, orderIds));
      
      console.log(`${orderIds.length}건의 송금 완료 표시 완료`);
    } catch (error) {
      console.error('일괄 송금 완료 표시 오류:', error);
      throw error;
    }
  }

  // 중복 정리를 위한 식물 관리 메서드들
  async removeAllPlants(): Promise<void> {
    try {
      await db.delete(plants);
      console.log('모든 식물 데이터가 삭제되었습니다');
    } catch (error) {
      console.error('식물 데이터 삭제 오류:', error);
      throw error;
    }
  }

  async insertMultiplePlants(plantsData: any[]): Promise<void> {
    try {
      if (plantsData.length === 0) {
        console.log('삽입할 식물 데이터가 없습니다');
        return;
      }

      // 데이터를 적절한 형식으로 변환
      const formattedPlants = plantsData.map(plant => ({
        name: plant.name,
        scientificName: plant.scientificName || null,
        description: plant.description || null,
        careInstructions: plant.careInstructions || null,
        light: plant.light || null,
        waterNeeds: plant.waterNeeds || null,
        humidity: plant.humidity || null,
        temperature: plant.temperature || null,
        winterTemperature: plant.winterTemperature || null,
        colorFeature: plant.colorFeature || null,
        plantType: plant.plantType || null,
        hasThorns: plant.hasThorns || false,
        leafShape1: plant.leafShape1 || null,
        leafShape2: plant.leafShape2 || null,
        leafShape3: plant.leafShape3 || null,
        leafShape4: plant.leafShape4 || null,
        experienceLevel: plant.experienceLevel || null,
        petSafety: plant.petSafety || null,
        size: plant.size || null,
        difficulty: plant.difficulty || null,
        priceRange: plant.priceRange || null,
        category: plant.category || null,
        imageUrl: plant.imageUrl || null
      }));

      await db.insert(plants).values(formattedPlants);
      console.log(`${plantsData.length}개의 식물 데이터가 삽입되었습니다`);
    } catch (error) {
      console.error('식물 데이터 삽입 오류:', error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();
