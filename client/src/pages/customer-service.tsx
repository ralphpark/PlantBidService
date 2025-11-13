import React from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { HelpCircle, RefreshCw, Truck, Calendar, AlertCircle } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

export default function CustomerServicePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <div className="container mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-12 text-center mt-8"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-primary mb-6 pt-10">고객센터</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              PlantBid는 고객님의 만족을 최우선으로 생각합니다. 
              아래에서 배송, 교환, 환불 및 취소에 관한 정책을 확인하실 수 있습니다.
            </p>
          </motion.div>

          <Tabs defaultValue="shipping" className="max-w-4xl mx-auto">
            <TabsList className="grid grid-cols-4 mb-8">
              <TabsTrigger value="shipping">
                <Truck className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">배송 안내</span>
                <span className="sm:hidden">배송</span>
              </TabsTrigger>
              <TabsTrigger value="exchange">
                <RefreshCw className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">교환 정책</span>
                <span className="sm:hidden">교환</span>
              </TabsTrigger>
              <TabsTrigger value="refund">
                <Calendar className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">환불 정책</span>
                <span className="sm:hidden">환불</span>
              </TabsTrigger>
              <TabsTrigger value="cancel">
                <AlertCircle className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">취소 규정</span>
                <span className="sm:hidden">취소</span>
              </TabsTrigger>
            </TabsList>

            {/* 배송 안내 */}
            <TabsContent value="shipping">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-primary">
                    <Truck className="h-5 w-5 mr-2" />
                    배송 안내
                  </CardTitle>
                  <CardDescription>식물 배송에 관한 중요 정보를 확인하세요</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">배송 기간</h3>
                      <p className="text-muted-foreground">
                        식물의 특성상 신중한 포장과 취급이 필요합니다. 주문 확정 후 판매자가 식물을 준비하고 1-3일 내에 발송됩니다.
                        배송은 평균 2-3일이 소요되며, 날씨 상황이나 공휴일에 따라 지연될 수 있습니다.
                      </p>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-2">배송 방법</h3>
                      <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                        <li>일반 배송: 2-3일 소요 (무료, 3만원 이상 구매 시)</li>
                        <li>우선 배송: 1-2일 소요 (추가 비용 5,000원)</li>
                        <li>직접 픽업: 판매자와 조율 후 직접 방문 수령 가능</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-2">특별 배송 안내</h3>
                      <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                        <li>중대형 식물(1m 이상)은 별도 배송비가 청구될 수 있습니다.</li>
                        <li>희귀 식물이나 특별 관리가 필요한 식물은 특수 포장으로 발송됩니다.</li>
                        <li>제주도 및 도서산간 지역은 추가 배송비가 발생합니다.</li>
                      </ul>
                    </div>

                    <div className="p-4 bg-green-50 rounded-lg">
                      <h3 className="text-lg font-semibold mb-2 text-green-800">식물 안전 배송 약속</h3>
                      <p className="text-green-700">
                        모든 식물은 운송 중 손상을 최소화하기 위해 특별 포장재와 보호 조치를 통해 발송됩니다.
                        배송 중 발생할 수 있는 온도 변화에 대비하여 계절에 따른 특별 포장 방식을 적용합니다.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 교환 정책 */}
            <TabsContent value="exchange">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-primary">
                    <RefreshCw className="h-5 w-5 mr-2" />
                    교환 정책
                  </CardTitle>
                  <CardDescription>식물 교환에 관한 규정을 안내합니다</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">교환 가능 조건</h3>
                      <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                        <li>상품 수령 후 24시간 이내에 상태 확인 및 문제 신고 필수</li>
                        <li>배송 중 손상된 식물</li>
                        <li>주문과 다른 종류의 식물이 배송된 경우</li>
                        <li>심각한 병충해가 있는 식물</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-2">교환 불가 조건</h3>
                      <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                        <li>고객의 관리 부주의로 인한 식물 상태 변화</li>
                        <li>상품 설명에 명시된 상태와 일치하는 경우 (잎의 자연적 변색, 계절적 특성 등)</li>
                        <li>배송 완료 후 24시간 이후 신고된 문제</li>
                        <li>특별 할인이나 특가로 구매한 상품 (별도 명시된 경우)</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-2">교환 신청 방법</h3>
                      <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
                        <li>마이페이지 {'->'} 주문내역에서 해당 상품의 '교환신청' 버튼 클릭</li>
                        <li>문제 상황에 대한 설명과 사진 첨부</li>
                        <li>판매자 확인 후 교환 승인 시 회수 및 재배송 진행</li>
                      </ol>
                      <p className="mt-2 text-muted-foreground">
                        ※ 교환 배송비: 판매자 책임인 경우 판매자 부담, 고객 변심의 경우 고객 부담
                      </p>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h3 className="text-lg font-semibold mb-2 text-blue-800">식물 상태 보증 정책</h3>
                      <p className="text-blue-700">
                        PlantBid는 모든 식물이 건강한 상태로 고객에게 전달될 것을 보증합니다.
                        배송 중 발생한 문제는 빠르게 해결해 드리니 안심하고 이용해 주세요.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 환불 정책 */}
            <TabsContent value="refund">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-primary">
                    <Calendar className="h-5 w-5 mr-2" />
                    환불 정책
                  </CardTitle>
                  <CardDescription>환불 처리 절차 및 규정을 안내합니다</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">환불 가능 조건</h3>
                      <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                        <li>상품 수령 후 24시간 이내에 문제 신고 필수</li>
                        <li>배송 중 심각하게 손상된 식물로 교환이 불가능한 경우</li>
                        <li>주문한 식물과 현저히 다른 상품이 배송된 경우</li>
                        <li>판매자가 7일 이내에 상품을 발송하지 않은 경우 자동 환불</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-2">환불 불가 조건</h3>
                      <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                        <li>고객의 부주의로 인한 식물 손상</li>
                        <li>식물의 자연적인 상태 변화 (계절적 변화, 성장 과정에서의 변화 등)</li>
                        <li>상품 설명에 명시된 상태와 일치하는 경우</li>
                        <li>맞춤 제작 또는 주문 제작된 화분, 장식품 등 (별도 명시된 경우)</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-2">환불 처리 기간</h3>
                      <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                        <li>카드 결제: 승인 취소 시 즉시 처리, 매입 후에는 3-5 영업일 소요</li>
                        <li>계좌 이체: 환불 승인 후 1-3 영업일 내 처리</li>
                        <li>포인트 결제: 환불 승인 즉시 복구</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-2">환불 신청 방법</h3>
                      <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
                        <li>마이페이지 {'->'} 주문내역에서 해당 상품의 '환불신청' 버튼 클릭</li>
                        <li>환불 사유와 상세 내용, 증빙 사진 첨부</li>
                        <li>판매자 확인 및 플랫폼 검토 후 환불 처리</li>
                      </ol>
                    </div>

                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <h3 className="text-lg font-semibold mb-2 text-yellow-800">환불 보장 프로그램</h3>
                      <p className="text-yellow-700">
                        PlantBid는 고객 만족을 최우선으로 생각합니다. 판매자와의 분쟁 발생 시
                        플랫폼 중재를 통해 공정한 해결을 도와드립니다. 식물 구매에 안심하세요.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 취소 규정 */}
            <TabsContent value="cancel">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-primary">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    취소 규정
                  </CardTitle>
                  <CardDescription>주문 취소에 관한 규정을 안내합니다</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">취소 가능 시점</h3>
                      <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                        <li><strong>판매자 확인 전:</strong> 100% 무료 취소 가능</li>
                        <li><strong>판매자 확인 후, 배송 준비 전:</strong> 취소 수수료 없음</li>
                        <li><strong>배송 준비 중:</strong> 판매자 협의 필요, 준비 상황에 따라 일부 취소 수수료 발생 가능</li>
                        <li><strong>배송 시작 후:</strong> 원칙적으로 취소 불가, 반품 절차 진행 필요</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-2">자동 취소 조건</h3>
                      <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                        <li>결제 후 24시간 이내 판매자 미확인 시 자동 취소 및 환불</li>
                        <li>판매자 확인 후 7일 이내 발송되지 않은 주문</li>
                        <li>품절 또는 재고 부족으로 배송 불가 시</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-2">취소 불가 상품</h3>
                      <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                        <li>맞춤 제작된 식물 화분 및 장식품</li>
                        <li>희귀 식물 중 판매자가 특별히 명시한 경우</li>
                        <li>예약 판매 또는 특별 할인 행사로 구매한 상품 (별도 고지된 경우)</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-2">취소 신청 방법</h3>
                      <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
                        <li>마이페이지 {'->'} 주문내역에서 해당 상품의 '주문취소' 버튼 클릭</li>
                        <li>취소 사유 선택 및 상세 내용 입력</li>
                        <li>판매자 확인 및 승인 후 취소 완료</li>
                      </ol>
                    </div>

                    <div className="p-4 bg-purple-50 rounded-lg">
                      <h3 className="text-lg font-semibold mb-2 text-purple-800">비대면 거래 안전 보장</h3>
                      <p className="text-purple-700">
                        PlantBid는 고객과 판매자 모두를 위한 안전한 거래 환경을 제공합니다.
                        취소 정책은 양측의 권리를 보호하며, 분쟁 발생 시 공정한 중재를 도와드립니다.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* 자주 묻는 질문 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-16 max-w-4xl mx-auto"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-primary mb-2">자주 묻는 질문</h2>
              <p className="text-muted-foreground">고객님들이 가장 많이 문의하시는 내용입니다</p>
            </div>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>식물이 배송 중 손상되었습니다. 어떻게 해야 하나요?</AccordionTrigger>
                <AccordionContent>
                  식물 수령 후 24시간 이내에 손상 부분의 사진을 찍어 마이페이지 &gt; 주문내역에서 '교환/환불신청' 버튼을 
                  통해 접수해 주세요. 판매자 확인 후 교환 또는 환불 처리를 도와드립니다. 
                  배송 중 손상된 경우 추가 비용 없이 처리해 드립니다.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger>주문한 식물이 생각했던 것과 달라요. 교환 가능한가요?</AccordionTrigger>
                <AccordionContent>
                  상품 페이지의 설명과 실제 제품이 다른 경우에는 교환/환불이 가능합니다. 
                  다만, 식물의 자연적인 개체 차이, 모니터에 따른 색상 차이, 계절에 따른 상태 변화 등은 
                  교환/환불 사유가 되지 않습니다. 상세한 사진과 함께 문제점을 접수해 주시면 검토 후 안내해 드립니다.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger>식물 관리 방법을 잘 모르겠어요. 도움을 받을 수 있나요?</AccordionTrigger>
                <AccordionContent>
                  모든 식물 상품은 기본적인 관리 가이드를 포함하고 있습니다. 
                  추가적인 도움이 필요하시면 마이페이지 &gt; 주문내역에서 해당 상품의 판매자에게 
                  직접 문의하실 수 있습니다. 또한 PlantBid의 '식물 케어 가이드' 섹션에서 
                  다양한 식물 관리 팁을 확인하실 수 있습니다.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger>주문 후 배송이 언제 시작되나요?</AccordionTrigger>
                <AccordionContent>
                  판매자가 주문을 확인한 후 1-3일 이내에 발송됩니다. 
                  식물은 특성상 신중한 포장과 날씨 상황 확인이 필요하므로, 
                  일반 상품보다 준비 기간이 조금 더 소요될 수 있습니다. 
                  발송이 시작되면 알림톡이나 문자로 배송 정보를 안내해 드립니다.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5">
                <AccordionTrigger>희귀식물도 구매 가능한가요?</AccordionTrigger>
                <AccordionContent>
                  네, PlantBid에서는 일반 식물부터 희귀식물까지 다양한 식물을 만나보실 수 있습니다. 
                  희귀식물은 재고가 한정되어 있어 구매 전 예약이 필요한 경우가 많습니다. 
                  희귀식물은 특성상 일반 식물과 취소/환불 정책이 다를 수 있으니, 
                  구매 전 판매 페이지의 정책을 반드시 확인해 주세요.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </motion.div>

          {/* 고객센터 연락처 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-16 text-center max-w-md mx-auto p-6 border border-border rounded-lg bg-card"
          >
            <HelpCircle className="h-10 w-10 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-3">추가 문의사항이 있으신가요?</h2>
            <p className="text-muted-foreground mb-4">
              언제든지 고객센터로 문의해 주시면 신속하게 답변 드리겠습니다.
            </p>
            <div className="space-y-2">
              <p>이메일: <span className="font-medium">simgo@simgo.kr</span></p>
              <p>전화: <span className="font-medium">02-1551-0525</span> (평일 10:00 - 18:00)</p>
              <p>채팅 상담: 홈페이지 우측 하단 채팅 아이콘 클릭</p>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
}