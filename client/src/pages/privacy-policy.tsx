import React from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <div className="container mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-10 max-w-3xl mx-auto mt-8"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-primary mb-14 pt-10">개인정보 처리방침</h1>
            
            <div className="prose prose-lg prose-green max-w-none">
              <p className="text-lg">
                주식회사 에스아이엠지오(이하 '회사')는 이용자의 개인정보 보호를 매우 중요하게 여기며, 「개인정보 보호법」, 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」 등 개인정보 보호와 관련된 법령을 준수하고 있습니다.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">1. 개인정보의 처리 목적</h2>
              <p>
                회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 「개인정보 보호법」 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
              </p>
              <ol className="list-decimal pl-5">
                <li>홈페이지 회원 가입 및 관리</li>
                <li>재화 또는 서비스 제공</li>
                <li>마케팅 및 광고에의 활용(선택)</li>
                <li>인공지능 기반 식물 추천 서비스 제공</li>
                <li>고객 상담 및 문의 응대</li>
              </ol>

              <h2 className="text-2xl font-semibold mt-8 mb-4">2. 개인정보의 처리 및 보유 기간</h2>
              <p>
                회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보 수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
              </p>
              <ol className="list-decimal pl-5">
                <li>회원 가입 및 관리: 회원 탈퇴 시까지</li>
                <li>재화 또는 서비스 제공: 서비스 공급완료 및 요금결제·정산 완료시까지</li>
                <li>마케팅 및 광고에의 활용: 동의 철회 시까지</li>
                <li>다만, 관계 법령 위반에 따른 수사·조사 등이 진행중인 경우에는 해당 수사·조사 종료 시까지</li>
                <li>법령에 따라 보존하여야 하는 경우 해당 기간 동안 보존</li>
              </ol>

              <h2 className="text-2xl font-semibold mt-8 mb-4">3. 개인정보의 제3자 제공</h2>
              <p>
                회사는 정보주체의 별도 동의, 법률의 특별한 규정 등 「개인정보 보호법」 제17조 및 제18조에 해당하는 경우에만 개인정보를 제3자에게 제공합니다.
              </p>
              <ol className="list-decimal pl-5">
                <li>회사는 다음과 같이 개인정보를 제3자에게 제공하고 있습니다.
                  <ul className="list-disc pl-5 mt-2">
                    <li>제공받는 자: 제휴 판매자(식물 판매업체)</li>
                    <li>제공 목적: 제품 배송, 서비스 제공</li>
                    <li>제공하는 항목: 이름, 연락처, 배송주소</li>
                    <li>보유 기간: 서비스 목적 달성 시까지</li>
                  </ul>
                </li>
              </ol>

              <h2 className="text-2xl font-semibold mt-8 mb-4">4. 개인정보처리 위탁</h2>
              <p>
                회사는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다.
              </p>
              <ol className="list-decimal pl-5">
                <li>
                  <ul className="list-disc pl-5 mt-2">
                    <li>위탁받는 자(수탁자): 포트원(PortOne)</li>
                    <li>위탁하는 업무의 내용: 결제 서비스</li>
                  </ul>
                </li>
                <li>
                  <ul className="list-disc pl-5 mt-2">
                    <li>위탁받는 자(수탁자): 물류 배송업체</li>
                    <li>위탁하는 업무의 내용: 상품 배송</li>
                  </ul>
                </li>
              </ol>
              <p>
                회사는 위탁계약 체결 시 「개인정보 보호법」 제26조에 따라 위탁업무 수행목적 외 개인정보 처리금지, 기술적․관리적 보호조치, 재위탁 제한, 수탁자에 대한 관리․감독, 손해배상 등 책임에 관한 사항을 계약서 등 문서에 명시하고, 수탁자가 개인정보를 안전하게 처리하는지를 감독하고 있습니다.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">5. 정보주체와 법정대리인의 권리·의무 및 그 행사방법</h2>
              <ol className="list-decimal pl-5">
                <li>정보주체는 회사에 대해 언제든지 개인정보 열람·정정·삭제·처리정지 요구 등의 권리를 행사할 수 있습니다.</li>
                <li>제1항에 따른 권리 행사는 회사에 대해 「개인정보 보호법」 시행령 제41조제1항에 따라 서면, 전자우편, 모사전송(FAX) 등을 통하여 하실 수 있으며 회사는 이에 대해 지체 없이 조치하겠습니다.</li>
                <li>제1항에 따른 권리 행사는 정보주체의 법정대리인이나 위임을 받은 자 등 대리인을 통하여 하실 수 있습니다. 이 경우 "개인정보 처리 방법에 관한 고시(제2020-7호)" 별지 제11호 서식에 따른 위임장을 제출하셔야 합니다.</li>
                <li>개인정보 열람 및 처리정지 요구는 「개인정보 보호법」 제35조 제4항, 제37조 제2항에 의하여 정보주체의 권리가 제한 될 수 있습니다.</li>
                <li>개인정보의 정정 및 삭제 요구는 다른 법령에서 그 개인정보가 수집 대상으로 명시되어 있는 경우에는 그 삭제를 요구할 수 없습니다.</li>
                <li>회사는 정보주체 권리에 따른 열람의 요구, 정정·삭제의 요구, 처리정지의 요구 시 열람 등 요구를 한 자가 본인이거나 정당한 대리인인지를 확인합니다.</li>
              </ol>

              <h2 className="text-2xl font-semibold mt-8 mb-4">6. 처리하는 개인정보의 항목</h2>
              <p>
                회사는 다음의 개인정보 항목을 처리하고 있습니다.
              </p>
              <ol className="list-decimal pl-5">
                <li>홈페이지 회원 가입 및 관리
                  <ul className="list-disc pl-5 mt-2">
                    <li>필수항목: 이름, 이메일주소, 비밀번호, 휴대폰번호</li>
                    <li>선택항목: 프로필 이미지, 주소, 식물 취향 정보</li>
                  </ul>
                </li>
                <li>재화 또는 서비스 제공
                  <ul className="list-disc pl-5 mt-2">
                    <li>필수항목: 이름, 휴대폰번호, 이메일주소, 배송주소, 결제정보</li>
                    <li>선택항목: 배송요청사항</li>
                  </ul>
                </li>
                <li>인터넷 서비스 이용과정에서 아래 개인정보 항목이 자동으로 생성되어 수집될 수 있습니다.
                  <ul className="list-disc pl-5 mt-2">
                    <li>IP주소, 쿠키, 서비스 이용 기록, 방문 기록, 불량 이용 기록 등</li>
                  </ul>
                </li>
              </ol>

              <h2 className="text-2xl font-semibold mt-8 mb-4">7. 개인정보의 파기</h2>
              <p>
                회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다.
              </p>
              <ol className="list-decimal pl-5">
                <li>파기절차
                  <ul className="list-disc pl-5 mt-2">
                    <li>이용자가 입력한 정보는 목적 달성 후 별도의 DB에 옮겨져(종이의 경우 별도의 서류) 내부 방침 및 기타 관련 법령에 따라 일정기간 저장된 후 혹은 즉시 파기됩니다. 이 때, DB로 옮겨진 개인정보는 법률에 의한 경우가 아니고서는 다른 목적으로 이용되지 않습니다.</li>
                  </ul>
                </li>
                <li>파기방법
                  <ul className="list-disc pl-5 mt-2">
                    <li>전자적 파일 형태의 정보는 기록을 재생할 수 없는 기술적 방법을 사용합니다.</li>
                    <li>종이에 출력된 개인정보는 분쇄기로 분쇄하거나 소각을 통하여 파기합니다.</li>
                  </ul>
                </li>
              </ol>

              <h2 className="text-2xl font-semibold mt-8 mb-4">8. 개인정보 자동 수집 장치의 설치·운영 및 거부에 관한 사항</h2>
              <ol className="list-decimal pl-5">
                <li>회사는 이용자에게 개별적인 맞춤서비스를 제공하기 위해 이용정보를 저장하고 수시로 불러오는 '쿠키(cookie)'를 사용합니다.</li>
                <li>쿠키는 웹사이트를 운영하는데 이용되는 서버(http)가 이용자의 컴퓨터 브라우저에게 보내는 소량의 정보이며 이용자들의 PC 컴퓨터내의 하드디스크에 저장되기도 합니다.
                  <ul className="list-disc pl-5 mt-2">
                    <li>쿠키의 사용 목적: 이용자가 방문한 각 서비스와 웹 사이트들에 대한 방문 및 이용형태, 인기 검색어, 보안접속 여부, 등을 파악하여 이용자에게 최적화된 정보 제공을 위해 사용됩니다.</li>
                    <li>쿠키의 설치·운영 및 거부: 웹브라우저 상단의 도구&gt;인터넷 옵션&gt;개인정보 메뉴의 옵션 설정을 통해 쿠키 저장을 거부 할 수 있습니다.</li>
                    <li>쿠키 저장을 거부할 경우 맞춤형 서비스 이용에 어려움이 발생할 수 있습니다.</li>
                  </ul>
                </li>
              </ol>

              <h2 className="text-2xl font-semibold mt-8 mb-4">9. 개인정보 보호책임자</h2>
              <ol className="list-decimal pl-5">
                <li>회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
                  <ul className="list-disc pl-5 mt-2">
                    <li>개인정보 보호책임자: 박근수</li>
                    <li>직책: CTO</li>
                    <li>연락처: 02-1551-0525, simda@simda.kr</li>
                  </ul>
                </li>
                <li>정보주체께서는 회사의 서비스를 이용하시면서 발생한 모든 개인정보 보호 관련 문의, 불만처리, 피해구제 등에 관한 사항을 개인정보 보호책임자에게 문의하실 수 있습니다. 회사는 정보주체의 문의에 대해 지체 없이 답변 및 처리해드릴 것입니다.</li>
              </ol>

              <h2 className="text-2xl font-semibold mt-8 mb-4">10. 개인정보 처리방침 변경</h2>
              <ol className="list-decimal pl-5">
                <li>이 개인정보처리방침은 2025년 5월 13일부터 적용됩니다.</li>
                <li>이전의 개인정보 처리방침은 아래에서 확인하실 수 있습니다.</li>
              </ol>

              <h2 className="text-2xl font-semibold mt-8 mb-4">11. 개인정보의 안전성 확보 조치</h2>
              <p>
                회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.
              </p>
              <ol className="list-decimal pl-5">
                <li>관리적 조치: 내부관리계획 수립·시행, 정기적 직원 교육 등</li>
                <li>기술적 조치: 개인정보처리시스템 등의 접근권한 관리, 접근통제시스템 설치, 고유식별정보 등의 암호화, 보안프로그램 설치</li>
                <li>물리적 조치: 전산실, 자료보관실 등의 접근통제</li>
              </ol>

              <h2 className="text-2xl font-semibold mt-8 mb-4">12. 개인정보 열람청구</h2>
              <p>
                정보주체는 ｢개인정보 보호법｣ 제35조에 따른 개인정보의 열람 청구를 아래의 부서에 할 수 있습니다. 회사는 정보주체의 개인정보 열람청구가 신속하게 처리되도록 노력하겠습니다.
              </p>
              <ol className="list-decimal pl-5">
                <li>개인정보 열람청구 접수·처리 부서
                  <ul className="list-disc pl-5 mt-2">
                    <li>부서명: 고객센터</li>
                    <li>담당자: 이주연</li>
                    <li>연락처: 02-1551-0525, simda@simda.kr</li>
                  </ul>
                </li>
              </ol>

              <h2 className="text-2xl font-semibold mt-8 mb-4">13. 정보주체의 권익침해에 대한 구제방법</h2>
              <p>
                정보주체는 개인정보침해로 인한 구제를 받기 위하여 개인정보분쟁조정위원회, 한국인터넷진흥원 개인정보침해신고센터 등에 분쟁해결이나 상담 등을 신청할 수 있습니다. 이 밖에 기타 개인정보침해의 신고, 상담에 대하여는 아래의 기관에 문의하시기 바랍니다.
              </p>
              <ol className="list-decimal pl-5">
                <li>개인정보분쟁조정위원회: (국번없이) 1833-6972 (www.kopico.go.kr)</li>
                <li>개인정보침해신고센터: (국번없이) 118 (privacy.kisa.or.kr)</li>
                <li>대검찰청: (국번없이) 1301 (www.spo.go.kr)</li>
                <li>경찰청: (국번없이) 182 (ecrm.cyber.go.kr)</li>
              </ol>

              <div className="bg-gray-50 p-6 rounded-lg mt-8">
                <h2 className="text-2xl font-semibold mb-4">회사 정보</h2>
                <ul className="list-none space-y-2">
                  <li><span className="font-medium">상호:</span> 주식회사 에스아이엠지오</li>
                  <li><span className="font-medium">대표자:</span> 이주연</li>
                  <li><span className="font-medium">주소:</span> 서울특별시 서초구 강남대로2길60, 1층</li>
                  <li><span className="font-medium">담당자:</span> 박근수</li>
                  <li><span className="font-medium">연락처:</span> 02-1551-0525</li>
                  <li><span className="font-medium">이메일:</span> simda@simda.kr</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
}