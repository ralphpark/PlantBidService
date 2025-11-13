import React, { useState, useEffect } from "react";
import DaumPostcode, { DaumPostcodeData } from "@/components/address/daum-postcode";
import BusinessNumberVerifier from "@/components/business/business-number-verifier";
import PhoneVerification from "@/components/verification/phone-verification";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Redirect } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PasswordStrength } from "@/components/auth/password-strength";
import { FieldDuplicateChecker } from "@/components/auth/field-duplicate-checker";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Logo } from "@/components/ui/logo";

// Login form schema
const loginSchema = z.object({
  username: z.string().min(3, "아이디는 최소 3자 이상이어야 합니다"),
  password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// Register form schema
const registerSchema = z.object({
  username: z.string().min(3, "아이디는 최소 3자 이상이어야 합니다"),
  email: z.string().email("유효한 이메일 주소를 입력해주세요"),
  password: z.string()
    .min(8, "비밀번호는 최소 8자 이상이어야 합니다")
    .regex(/[A-Z]/, "비밀번호에 대문자가 포함되어야 합니다")
    .regex(/[0-9]/, "비밀번호에 숫자가 포함되어야 합니다")
    .regex(/[!@#$%^&*(),.?":{}|<>]/, "비밀번호에 특수문자가 포함되어야 합니다"),
  confirmPassword: z.string(),
  role: z.enum(["user", "vendor"]),
  name: z.string().optional(),
  phone: z.string().optional(),
  region: z.string().optional(),
  // 판매자 관련 추가 필드
  storeName: z.string().optional(), // 상호명
  contactInfo: z.string().optional(),
  bio: z.string().optional(),
  // 새로운 주소 관련 필드
  zipCode: z.string().optional(),
  address: z.string().optional(),
  addressDetail: z.string().optional(),
  lat: z.string().optional(), // 위도
  lng: z.string().optional(), // 경도
  // 사업자 등록번호 관련 필드
  businessNumber: z.string().optional(),
  businessVerified: z.boolean().optional(),
  // 휴대폰 인증 관련 필드
  phoneVerified: z.boolean().optional(),
  // 중복 확인 플래그
  usernameAvailable: z.boolean().optional(),
  emailAvailable: z.boolean().optional(),
  phoneAvailable: z.boolean().optional(),
  businessNumberAvailable: z.boolean().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "비밀번호가 일치하지 않습니다",
  path: ["confirmPassword"],
}).refine((data) => {
  // 벤더(판매자)인 경우 주소, 사업자 번호, 휴대폰 인증 필요
  if (data.role === "vendor") {
    return !!data.address && !!data.zipCode && !!data.businessNumber && 
           !!data.businessVerified && !!data.phoneVerified;
  }
  return true;
}, {
  message: "주소, 사업자 등록번호, 휴대폰 번호 인증이 필요합니다",
  path: ["role"],
}).refine((data) => {
  // 아이디 중복 확인 필수
  return data.usernameAvailable === true;
}, {
  message: "아이디 중복 확인이 필요합니다",
  path: ["username"],
}).refine((data) => {
  // 이메일 중복 확인 필수
  return data.emailAvailable === true;
}, {
  message: "이메일 중복 확인이 필요합니다",
  path: ["email"],
}).refine((data) => {
  // 전화번호가 있는 경우 중복 확인 필수
  return !data.phone || data.phoneAvailable === true;
}, {
  message: "전화번호 중복 확인이 필요합니다",
  path: ["phone"],
}).refine((data) => {
  // 사업자번호가 있는 경우 중복 확인 필수
  return !data.businessNumber || data.businessNumberAvailable === true;
}, {
  message: "사업자번호 중복 확인이 필요합니다",
  path: ["businessNumber"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<string>("login");
  const { user, loginMutation, registerMutation } = useAuth();
  const [, setLocation] = useLocation();

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "user",
      name: "",
      phone: "",
      region: "",
      // 판매자 관련 필드
      storeName: "",
      contactInfo: "",
      bio: "",
      // 주소 관련 필드
      zipCode: "",
      address: "",
      addressDetail: "",
      lat: "",
      lng: "",
      // 사업자 등록 및 휴대폰 인증 필드
      businessNumber: "",
      businessVerified: false,
      phoneVerified: false,
    },
  });

  // Watch the role to conditionally show fields
  const role = registerForm.watch("role");

  // Submit handlers
  const onLoginSubmit = (values: LoginFormValues) => {
    loginMutation.mutate(values);
  };

  const onRegisterSubmit = (values: RegisterFormValues) => {
    // Omit confirmPassword before sending
    const { confirmPassword, ...registerData } = values;
    registerMutation.mutate(registerData);
  };

  // 권한에 따라 적절한 페이지로 리디렉션
  if (user) {
    // 판매자는 대시보드로 이동
    if (user.role === 'vendor') {
      return <Redirect to="/vendor-dashboard" />;
    }
    // 일반 사용자는 홈으로 이동
    return <Redirect to="/" />;
  }

  return (
    <div className="flex min-h-screen">
      
      {/* Form section */}
      <div className="flex flex-col items-center justify-center w-full lg:w-1/2 p-8">
        <Logo className="mb-8 h-16" />
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-md">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">로그인</TabsTrigger>
            <TabsTrigger value="register">회원가입</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>로그인</CardTitle>
                <CardDescription>
                  계정 정보를 입력하여 로그인하세요.
                </CardDescription>
              </CardHeader>
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)}>
                  <CardContent className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>아이디</FormLabel>
                          <FormControl>
                            <Input placeholder="아이디 입력" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>비밀번호</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                  <CardFooter className="flex flex-col gap-3">
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={loginMutation.isPending}
                      data-testid="button-login"
                    >
                      {loginMutation.isPending ? "로그인 중..." : "로그인"}
                    </Button>
                    <a 
                      href="/forgot-password" 
                      className="text-sm text-muted-foreground hover:text-primary transition-colors text-center"
                      data-testid="link-forgot-password"
                    >
                      비밀번호를 잊으셨나요?
                    </a>
                  </CardFooter>
                </form>
              </Form>
            </Card>
          </TabsContent>
          
          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle>회원가입</CardTitle>
                <CardDescription>
                  새 계정을 만들기 위해 정보를 입력하세요.
                </CardDescription>
              </CardHeader>
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)}>
                  <CardContent className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>계정 유형</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="계정 유형 선택" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="user">식물 애호가</SelectItem>
                              <SelectItem value="vendor">식물 판매자</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>아이디</FormLabel>
                            <FormControl>
                              <FieldDuplicateChecker
                                fieldName="username"
                                fieldLabel="아이디"
                                onDuplicateCheck={(isDuplicate) => {
                                  registerForm.setValue("usernameAvailable", !isDuplicate);
                                }}
                                placeholder="아이디 입력"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>이메일</FormLabel>
                            <FormControl>
                              <FieldDuplicateChecker
                                fieldName="email"
                                fieldLabel="이메일"
                                onDuplicateCheck={(isDuplicate) => {
                                  registerForm.setValue("emailAvailable", !isDuplicate);
                                }}
                                type="email"
                                placeholder="email@example.com"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>비밀번호</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••" {...field} />
                            </FormControl>
                            <PasswordStrength password={field.value} />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>비밀번호 확인</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="••••••" 
                                {...field}
                                className={
                                  field.value && registerForm.getValues("password") !== field.value
                                    ? "border-red-500 focus:ring-red-500"
                                    : field.value && registerForm.getValues("password") === field.value
                                    ? "border-green-500 focus:ring-green-500"
                                    : ""
                                }
                                onChange={(e) => {
                                  field.onChange(e);
                                  if (e.target.value) {
                                    registerForm.trigger("confirmPassword");
                                  }
                                }}
                              />
                            </FormControl>
                            {field.value && (
                              <div className="text-xs">
                                {registerForm.getValues("password") === field.value ? (
                                  <span className="text-green-500">비밀번호가 일치합니다</span>
                                ) : (
                                  <span className="text-red-500">비밀번호가 일치하지 않습니다</span>
                                )}
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={registerForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>휴대폰 번호 인증</FormLabel>
                          <div className="space-y-2">
                            <FormControl>
                              <FieldDuplicateChecker
                                fieldName="phone"
                                fieldLabel="휴대폰 번호"
                                onDuplicateCheck={(isDuplicate) => {
                                  registerForm.setValue("phoneAvailable", !isDuplicate);
                                }}
                                placeholder="휴대폰 번호 입력"
                                onChange={(e) => {
                                  field.onChange(e.target.value);
                                }}
                                value={field.value}
                                className="w-full"
                              />
                            </FormControl>
                            <div className="flex justify-start">
                              <PhoneVerification
                                value={field.value || ""}
                                onChange={(e) => {
                                  field.onChange(e.target.value);
                                }}
                                onVerificationResult={(isVerified) => {
                                  registerForm.setValue("phoneVerified", isVerified);
                                  if (isVerified) {
                                    registerForm.trigger("phone");
                                    registerForm.trigger("phoneVerified");
                                  }
                                }}
                              />
                            </div>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>이름</FormLabel>
                          <FormControl>
                            <Input placeholder="홍길동" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Conditional fields for vendors */}
                    {role === "vendor" && (
                      <>
                        <FormField
                          control={registerForm.control}
                          name="storeName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>업체명</FormLabel>
                              <FormControl>
                                <Input placeholder="사업체 이름을 입력하세요" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="contactInfo"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>매장 정보</FormLabel>
                              <FormControl>
                                <Input placeholder="매장 전화번호, 영업시간 등" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="bio"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>사업 소개</FormLabel>
                              <FormControl>
                                <Input placeholder="사업체에 대해 간략히 설명해주세요" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* 주소 관련 필드 */}
                        <div className="space-y-2">
                          <FormLabel>사업자 주소</FormLabel>
                          
                          {/* 다음 우편번호 검색 */}
                          <div className="flex items-center space-x-2">
                            <FormField
                              control={registerForm.control}
                              name="zipCode"
                              render={({ field }) => (
                                <FormItem className="flex-1">
                                  <FormControl>
                                    <Input
                                      placeholder="우편번호"
                                      {...field}
                                      readOnly
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <DaumPostcode
                              buttonLabel="주소 검색"
                              dialogTitle="주소 찾기"
                              onComplete={async (data) => {
                                // 우편번호, 주소 설정
                                const fullAddress = data.roadAddress || data.jibunAddress;
                                registerForm.setValue("zipCode", data.zonecode);
                                registerForm.setValue("address", fullAddress);
                                
                                // 지오코딩으로 좌표 가져오기
                                try {
                                  const { geocodeAddress } = await import('@/lib/utils');
                                  const { lat, lng } = await geocodeAddress(fullAddress);
                                  
                                  if (lat && lng) {
                                    console.log(`주소 좌표: 위도 ${lat}, 경도 ${lng}`);
                                    registerForm.setValue("lat", lat.toString());
                                    registerForm.setValue("lng", lng.toString());
                                  } else {
                                    console.warn('주소 좌표를 가져오지 못했습니다');
                                  }
                                } catch (error) {
                                  console.error('지오코딩 오류:', error);
                                }
                                
                                // 주소 관련 필드 유효성 검사 트리거
                                registerForm.trigger("zipCode");
                                registerForm.trigger("address");
                              }}
                            />
                          </div>
                          
                          {/* 기본 주소 */}
                          <FormField
                            control={registerForm.control}
                            name="address"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    placeholder="기본 주소"
                                    {...field}
                                    readOnly
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          {/* 상세 주소 */}
                          <FormField
                            control={registerForm.control}
                            name="addressDetail"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    placeholder="상세 주소 (건물명, 동/호수 등)"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* 사업자 등록번호 검증 */}
                        <FormField
                          control={registerForm.control}
                          name="businessNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>사업자 등록번호</FormLabel>
                              <div className="space-y-2">
                                <FormControl>
                                  <FieldDuplicateChecker
                                    fieldName="businessNumber"
                                    fieldLabel="사업자 등록번호"
                                    onDuplicateCheck={(isDuplicate) => {
                                      registerForm.setValue("businessNumberAvailable", !isDuplicate);
                                    }}
                                    placeholder="사업자 등록번호 입력"
                                    onChange={(e) => {
                                      field.onChange(e.target.value);
                                    }}
                                    value={field.value}
                                    className="w-full"
                                  />
                                </FormControl>
                                <div className="flex justify-start">
                                  <BusinessNumberVerifier
                                    value={field.value || ""}
                                    onChange={(e) => {
                                      field.onChange(e.target.value);
                                    }}
                                    onVerificationResult={(isVerified) => {
                                      registerForm.setValue("businessVerified", isVerified);
                                      if (isVerified) {
                                        registerForm.trigger("businessNumber");
                                        registerForm.trigger("businessVerified");
                                      }
                                    }}
                                  />
                                </div>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? "계정 생성 중..." : "회원가입"}
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Hero section */}
      <div className="hidden lg:flex lg:w-1/2 bg-muted items-center justify-center p-8">
        <div className="max-w-md">
          <h1 className="text-4xl font-bold mb-6">심다 (PlantBid)</h1>
          <p className="text-xl mb-6">
            AI 기반 맞춤형 식물 추천 및 지역 공급업체 연결 서비스
          </p>
          <ul className="space-y-2">
            <li className="flex items-center">
              <div className="mr-2 rounded-full bg-primary h-6 w-6 flex items-center justify-center text-primary-foreground text-sm">1</div>
              <span>환경에 맞는 맞춤형 식물 추천 받기</span>
            </li>
            <li className="flex items-center">
              <div className="mr-2 rounded-full bg-primary h-6 w-6 flex items-center justify-center text-primary-foreground text-sm">2</div>
              <span>지역 공급업체와 연결하여 최상의 가격과 배송 옵션 이용</span>
            </li>
            <li className="flex items-center">
              <div className="mr-2 rounded-full bg-primary h-6 w-6 flex items-center justify-center text-primary-foreground text-sm">3</div>
              <span>주문 추적 및 식물 컬렉션 관리 한 곳에서</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}