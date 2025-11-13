import { pgTable, text, serial, integer, boolean, timestamp, numeric, foreignKey, json, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session table for express-session
export const session = pgTable("session", {
  sid: text("sid").primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire", { mode: "date" }).notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  name: text("name"),
  phone: text("phone"),
  storeName: text("store_name"), // 이전 region 필드를 상호명으로 변경
  role: text("role", { enum: ["user", "vendor", "admin"] }).notNull().default("user"),
  contactInfo: text("contact_info"),
  bio: text("bio"),
  businessNumber: text("business_number"), // 사업자 등록번호
  address: text("address"), // 주소
  addressDetail: text("address_detail"), // 상세 주소
  zipCode: text("zip_code"), // 우편번호
  businessVerified: boolean("business_verified").default(false), // 사업자 번호 인증 여부
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const plants = pgTable("plants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  imageUrl: text("image_url"),
  scientificName: text("scientific_name"),
  description: text("description"),
  waterNeeds: text("water_needs"),
  light: text("light"),
  humidity: text("humidity"),
  temperature: text("temperature"),
  winterTemperature: text("winter_temperature"),
  colorFeature: text("color_feature"),
  plantType: text("plant_type"),
  hasThorns: boolean("has_thorns"),
  leafShape1: text("leaf_shape1"),
  leafShape2: text("leaf_shape2"),
  leafShape3: text("leaf_shape3"),
  leafShape4: text("leaf_shape4"),
  experienceLevel: text("experience_level"),
  petSafety: text("pet_safety"),
  size: text("size"),
  difficulty: text("difficulty"),
  priceRange: text("price_range"),
  careInstructions: text("care_instructions"),
  category: text("category"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id), // 사용자 ID 참조
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  storeName: text("store_name").notNull(), // 기존 region 필드를 대체 (region은 더이상 사용하지 않음)
  address: text("address").notNull(),
  description: text("description"),
  rating: numeric("rating", { precision: 3, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  color: json("color").$type<{ bg: string, border: string }>(),
});

export const bids = pgTable("bids", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  vendorId: integer("vendor_id").notNull().references(() => vendors.id),
  plantId: integer("plant_id").notNull().references(() => plants.id),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  additionalServices: text("additional_services"),
  deliveryDate: timestamp("delivery_date"),
  status: text("status").notNull().default("pending"), // 'pending', 'accepted', 'rejected', 'completed', 'paid', 'shipping', 'delivered'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  conversationId: integer("conversation_id"),
  selectedProductId: integer("selected_product_id"),
  vendorMessage: text("vendor_message"),
  referenceImages: json("reference_images").$type<string[]>(),
  paymentId: integer("payment_id"), // Reference to payment record
  orderId: text("order_id"), // Reference to order by order ID
  customerInputAddress: text("customer_input_address"), // 고객이 직접 입력한 주소
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  messages: json("messages").notNull().$type<{
    role: 'user' | 'assistant' | 'vendor';
    content: string;
    timestamp: string;
    vendorId?: number; // 판매자 ID (판매자 메시지에만 사용)
    imageUrl?: string; // 이미지 URL (판매자 메시지에만 사용)
    price?: number; // 가격 (판매자 메시지에만 사용)
    productInfo?: any; // 제품 정보 (판매자 메시지에만 사용)
    bidInfo?: any; // 입찰 정보 (판매자 메시지에만 사용)
    recommendations?: Array<{
      name: string;
      description: string;
      careInstructions: string;
      priceRange: string;
      imageUrl?: string;
    }>;
    // 지역 상점 관련 정보
    locationInfo?: {
      address: string;
      lat: number;
      lng: number;
      radius: number;
    };
    vendors?: Array<{
      id: number;
      name: string;
      storeName?: string;
      address: string;
      distance?: number;
      lat?: number;
      lng?: number;
      products?: Array<any>;
    }>;
  }[]>(),
  plantRecommendations: json("plant_recommendations").$type<{
    plantId: number;
    score: number;
    reason: string;
  }[]>(),
  status: text("status").notNull().default("active"), // 'active', 'completed'
  // 사용자 요청사항 필드들
  userRequests: text("user_requests"), // 일반 요청사항
  ribbonRequest: boolean("ribbon_request").default(false), // 리본 요청 여부
  ribbonMessage: text("ribbon_message"), // 리본 메시지
  deliveryTime: text("delivery_time"), // 희망 배송시간
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 제품(Products) 테이블 - 판매자가 등록한 제품 정보 저장
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id), // 판매자 ID
  plantId: integer("plant_id").references(() => plants.id), // 식물 ID (선택사항)
  name: text("name").notNull(), // 제품명
  description: text("description"), // 제품 설명
  category: text("category"), // 제품 카테고리
  price: numeric("price", { precision: 10, scale: 2 }).notNull(), // 가격
  stock: integer("stock").notNull().default(0), // 재고
  imageUrl: text("image_url"), // 이미지 URL
  onlineStoreVisible: boolean("online_store_visible").default(false), // 온라인 상점 노출 여부
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 매장 위치(Store Locations) 테이블 - 판매자의 매장 위치 정보 저장
export const storeLocations = pgTable("store_locations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id), // 판매자 ID
  address: text("address").notNull(), // 주소
  region: text("region"), // 지역
  lat: doublePrecision("lat"), // 위도
  lng: doublePrecision("lng"), // 경도
  radius: integer("radius").default(5), // 서비스 반경 (km)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 결제(Payments) 테이블 - 토스페이먼츠/포트원 결제 정보 저장
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id), // 사용자 ID
  bidId: integer("bid_id").notNull().references(() => bids.id), // 입찰 ID
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(), // 결제 금액
  status: text("status").notNull().default("ready"), // 'ready', 'pending', 'success', 'fail', 'cancel', 'CANCELLED'
  paymentKey: text("payment_key"), // 결제 키 (UUID 형식)
  merchantId: text("merchant_id"), // 상점 주문번호 (MOI 형식)
  orderId: text("order_id").notNull(), // 주문 번호 (pay_ 형식)
  orderName: text("order_name").notNull(), // 주문명
  method: text("method"), // 결제 방법 - 카드, 가상계좌 등
  requestedAt: timestamp("requested_at"), // 결제 요청 시간
  approvedAt: timestamp("approved_at"), // 결제 승인 시간
  receipt: json("receipt").$type<any>(), // 영수증 정보
  customerName: text("customer_name"), // 고객 이름
  customerEmail: text("customer_email"), // 고객 이메일
  customerMobilePhone: text("customer_mobile_phone"), // 고객 휴대전화
  paymentUrl: text("payment_url"), // 결제 페이지 URL
  failReason: text("fail_reason"), // 결제 실패 사유
  cancelReason: text("cancel_reason"), // 결제 취소 사유
  cancelledAt: timestamp("cancelled_at"), // 결제 취소 시간
  taxInvoiceIssued: boolean("tax_invoice_issued").default(false), // 세금계산서 발행 여부
  transferCompleted: boolean("transfer_completed").default(false), // 송금 완료 여부
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 주문(Orders) 테이블 - 구매 주문 정보 저장
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id), // 구매자 ID
  vendorId: integer("vendor_id").notNull().references(() => vendors.id), // 판매자 ID
  productId: integer("product_id").notNull().references(() => products.id), // 제품 ID
  conversationId: integer("conversation_id").notNull(), // 대화 ID
  price: numeric("price", { precision: 10, scale: 2 }).notNull(), // 주문 금액
  status: text("status").notNull().default("created"), // 'created', 'paid', 'shipping', 'delivered', 'completed', 'cancelled'
  orderId: text("order_id").notNull().unique(), // 주문 번호 (외부 주문번호)
  buyerInfo: json("buyer_info").notNull(), // 구매자 정보 (이름, 전화번호, 주소 등)
  recipientInfo: json("recipient_info").notNull(), // 수령인 정보 (이름, 전화번호, 주소 등)
  paymentInfo: json("payment_info"), // 결제 정보
  trackingInfo: json("tracking_info"), // 배송 추적 정보
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
});

// 알림(Notifications) 테이블 - 사용자 알림 정보 저장
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id), // 수신자 ID
  senderId: integer("sender_id").references(() => users.id), // 발신자 ID
  type: text("type").notNull(), // 'order', 'bid', 'payment', 'shipping', 'delivery', 'message', 'rejected', 'accepted'
  message: text("message").notNull(), // 알림 메시지
  conversationId: integer("conversation_id"), // 관련 대화 ID
  orderId: text("order_id"), // 관련 주문 ID
  status: text("status").notNull().default("unread"), // 'read', 'unread'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  readAt: timestamp("read_at"), // 읽은 시간
});

// 사이트 설정(Site Settings) 테이블 - 메인페이지 및 사이트 설정 저장
export const siteSettings = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  siteTitle: text("site_title").notNull().default("PlantBid"),
  siteDescription: text("site_description"),
  homePage: json("home_page").$type<{
    title: string;
    subtitle: string;
    typingPhrases: string[];
    buttonText1: string;
    buttonText2: string;
    feature1Title: string;
    feature1Description: string;
    feature2Title: string;
    feature2Description: string;
    feature3Title: string;
    feature3Description: string;
    ctaTitle: string;
    ctaDescription: string;
    ctaButtonText: string;
  }>(),
  headerSettings: json("header_settings"),
  footerSettings: json("footer_settings"),
  seoSettings: json("seo_settings"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// AI 설정(AI Settings) 테이블 - Gemini AI 모델 설정 저장
export const aiSettings = pgTable("ai_settings", {
  id: serial("id").primaryKey(),
  temperature: doublePrecision("temperature").notNull().default(0.7),
  maxOutputTokens: integer("max_output_tokens").notNull().default(2048),
  topK: integer("top_k").notNull().default(40),
  topP: doublePrecision("top_p").notNull().default(0.95),
  enableTracing: boolean("enable_tracing").default(false),
  systemPrompt: text("system_prompt").notNull().default("당신은 전문적인 식물 상담사입니다. 사용자의 질문에 친절하고 정확하게 답변해주세요."),
  plantRecommendationPrompt: text("plant_recommendation_prompt").notNull().default("사용자의 환경과 선호도를 고려하여 최적의 식물을 추천해주세요."),
  vendorCommunicationPrompt: text("vendor_communication_prompt").notNull().default("업체와의 소통에서 전문적이고 친절한 톤을 유지해주세요."),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  bids: many(bids),
  conversations: many(conversations),
  products: many(products),
  storeLocations: many(storeLocations),
  orders: many(orders),
  notifications: many(notifications),
}));

export const plantsRelations = relations(plants, ({ many }) => ({
  bids: many(bids),
}));

export const vendorsRelations = relations(vendors, ({ many }) => ({
  bids: many(bids),
  orders: many(orders),
}));

export const bidsRelations = relations(bids, ({ one }) => ({
  user: one(users, {
    fields: [bids.userId],
    references: [users.id],
  }),
  vendor: one(vendors, {
    fields: [bids.vendorId],
    references: [vendors.id],
  }),
  plant: one(plants, {
    fields: [bids.plantId],
    references: [plants.id],
  }),
  conversation: one(conversations, {
    fields: [bids.conversationId],
    references: [conversations.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
  bid: one(bids, {
    fields: [payments.bidId],
    references: [bids.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
  bids: many(bids),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  user: one(users, {
    fields: [products.userId],
    references: [users.id],
  }),
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  vendor: one(vendors, {
    fields: [orders.vendorId],
    references: [vendors.id],
  }),
  product: one(products, {
    fields: [orders.productId],
    references: [products.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  sender: one(users, {
    fields: [notifications.senderId],
    references: [users.id],
  }),
}));

export const storeLocationsRelations = relations(storeLocations, ({ one }) => ({
  user: one(users, {
    fields: [storeLocations.userId],
    references: [users.id],
  }),
}));

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  name: true,
  phone: true,
  storeName: true, // 이전 region 필드에서 변경됨
  role: true,
  contactInfo: true,
  bio: true,
  businessNumber: true,
  address: true,
  addressDetail: true,
  zipCode: true,
  businessVerified: true,
});

export const insertPlantSchema = createInsertSchema(plants).pick({
  name: true,
  imageUrl: true,
  scientificName: true,
  description: true,
  waterNeeds: true,
  light: true,
  humidity: true,
  temperature: true,
  winterTemperature: true,
  colorFeature: true,
  plantType: true,
  hasThorns: true,
  leafShape1: true,
  leafShape2: true,
  leafShape3: true,
  leafShape4: true,
  experienceLevel: true,
  petSafety: true,
  size: true,
  difficulty: true,
  priceRange: true,
  careInstructions: true,
  category: true,
});

export const insertVendorSchema = createInsertSchema(vendors).pick({
  name: true,
  email: true,
  phone: true,
  storeName: true, // region 대신 storeName 사용
  address: true,
  description: true,
  rating: true,
  color: true, // 색상 정보 추가
});

export const insertBidSchema = createInsertSchema(bids).pick({
  userId: true,
  vendorId: true,
  plantId: true,
  price: true,
  additionalServices: true,
  deliveryDate: true,
  status: true,
  conversationId: true,
  selectedProductId: true,
  vendorMessage: true,
  referenceImages: true,
  customerInputAddress: true,
  orderId: true,
  paymentId: true,
});

export const insertConversationSchema = createInsertSchema(conversations).pick({
  userId: true,
  messages: true,
  plantRecommendations: true,
  status: true,
});

// 제품 스키마
export const insertProductSchema = createInsertSchema(products).pick({
  userId: true,
  name: true,
  description: true,
  category: true,
  price: true,
  stock: true,
  imageUrl: true,
  onlineStoreVisible: true,
});

// 매장 위치 스키마
export const insertStoreLocationSchema = createInsertSchema(storeLocations).pick({
  userId: true,
  address: true,
  region: true,
  lat: true,
  lng: true,
  radius: true,
});

// 결제 스키마
export const insertPaymentSchema = createInsertSchema(payments).pick({
  userId: true,
  bidId: true,
  amount: true,
  status: true,
  paymentKey: true,
  merchantId: true, // 상점 주문번호 (MOI 형식) 추가
  orderId: true,
  orderName: true,
  method: true,
  requestedAt: true,
  approvedAt: true,
  receipt: true,
  customerName: true,
  customerEmail: true,
  customerMobilePhone: true,
  paymentUrl: true,
  failReason: true,
  cancelReason: true,
  cancelledAt: true
});

// 주문 스키마
export const insertOrderSchema = createInsertSchema(orders).pick({
  userId: true,
  vendorId: true,
  productId: true,
  conversationId: true,
  price: true,
  status: true,
  orderId: true,
  buyerInfo: true,
  recipientInfo: true,
  paymentInfo: true,
  trackingInfo: true,
});

// 알림 스키마
export const insertNotificationSchema = createInsertSchema(notifications).pick({
  userId: true,
  senderId: true,
  type: true,
  message: true,
  conversationId: true,
  orderId: true,
  status: true,
});

// AI 설정 스키마
export const insertAISettingsSchema = createInsertSchema(aiSettings).pick({
  temperature: true,
  maxOutputTokens: true,
  topK: true,
  topP: true,
  enableTracing: true,
  systemPrompt: true,
  plantRecommendationPrompt: true,
  vendorCommunicationPrompt: true,
});

// 비밀번호 재설정 토큰 스키마
export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

export type InsertPlant = z.infer<typeof insertPlantSchema>;
export type Plant = typeof plants.$inferSelect;

export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Vendor = typeof vendors.$inferSelect;

export type InsertBid = z.infer<typeof insertBidSchema>;
export type Bid = typeof bids.$inferSelect;

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

export type InsertStoreLocation = z.infer<typeof insertStoreLocationSchema>;
export type StoreLocation = typeof storeLocations.$inferSelect;

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export type InsertAISettings = z.infer<typeof insertAISettingsSchema>;
export type AISettings = typeof aiSettings.$inferSelect;
