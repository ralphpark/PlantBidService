import React from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

export default function TermsOfServicePage() {
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
            <h1 className="text-4xl md:text-5xl font-bold text-primary mb-14 pt-10">이용약관</h1>
            
            <div className="prose prose-lg prose-green max-w-none">
              <h2 className="text-2xl font-semibold mt-8 mb-4">제1조 (목적)</h2>
              <p>
                이 약관은 주식회사 에스아이엠지오(이하 "회사"라 합니다)가 제공하는 인공지능 기반 식물중개 서비스(이하 "서비스"라 합니다)의 이용과 관련하여 회사와 회원 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">제2조 (정의)</h2>
              <ol className="list-decimal pl-5">
                <li>"회원"이라 함은 본 약관에 동의하고 회사가 제공하는 서비스를 이용하는 자를 말합니다.</li>
                <li>"서비스"라 함은 회사가 인공지능 기술을 활용하여 제공하는 식물 중개 및 관련 정보 제공 서비스를 말합니다.</li>
                <li>"게시물"이라 함은 회원이 서비스를 이용함에 있어 서비스상에 게시한 글, 사진, 각종 파일 및 링크 등을 의미합니다.</li>
              </ol>

              <h2 className="text-2xl font-semibold mt-8 mb-4">제3조 (약관의 명시, 효력 및 변경)</h2>
              <ol className="list-decimal pl-5">
                <li>회사는 본 약관의 내용을 회원이 쉽게 알 수 있도록 서비스 초기화면에 게시합니다.</li>
                <li>회사는 관련 법령을 위배하지 않는 범위에서 본 약관을 변경할 수 있습니다.</li>
                <li>회사가 약관을 변경할 경우에는 적용일자 및 변경사유를 명시하여 현행 약관과 함께 서비스 초기화면에 그 적용일자 7일 전부터 공지합니다.</li>
                <li>변경된 약관에 동의하지 않는 회원은 서비스 이용을 중단하고 탈퇴할 수 있습니다.</li>
              </ol>

              <h2 className="text-2xl font-semibold mt-8 mb-4">제4조 (서비스의 제공 및 변경)</h2>
              <ol className="list-decimal pl-5">
                <li>회사는 다음과 같은 서비스를 제공합니다.
                  <ul className="list-disc pl-5 mt-2">
                    <li>인공지능 기반 식물 정보 및 중개 서비스</li>
                    <li>식물 거래 관련 정보 제공</li>
                    <li>기타 회사가 정하는 서비스</li>
                  </ul>
                </li>
                <li>회사는 서비스의 내용, 운영상 또는 기술상 필요에 따라 제공하는 서비스의 내용을 변경할 수 있습니다.</li>
              </ol>

              <h2 className="text-2xl font-semibold mt-8 mb-4">제5조 (서비스의 중단)</h2>
              <ol className="list-decimal pl-5">
                <li>회사는 서비스의 제공을 위해 필요한 경우 정기점검을 실시할 수 있으며, 이 기간 동안 서비스 제공이 일시 중단될 수 있습니다.</li>
                <li>회사는 천재지변, 불가항력적 사유 등으로 인해 서비스 제공이 어려운 경우 서비스의 제공을 일시적으로 중단할 수 있습니다.</li>
              </ol>

              <h2 className="text-2xl font-semibold mt-8 mb-4">제6조 (회원가입)</h2>
              <ol className="list-decimal pl-5">
                <li>회원가입은 이용자가 약관의 내용에 동의하고 회원가입 신청을 한 후, 회사가 이를 승낙함으로써 성립합니다.</li>
                <li>회사는 다음 각 호에 해당하는 회원가입 신청에 대하여는 승낙을 하지 않을 수 있습니다.
                  <ul className="list-disc pl-5 mt-2">
                    <li>타인 명의로 신청한 경우</li>
                    <li>허위의 정보를 기재한 경우</li>
                    <li>기타 회사가 정한 이용신청 요건을 충족하지 못한 경우</li>
                  </ul>
                </li>
              </ol>

              <h2 className="text-2xl font-semibold mt-8 mb-4">제7조 (회원의 의무)</h2>
              <ol className="list-decimal pl-5">
                <li>회원은 관계 법령, 본 약관의 규정, 이용안내 및 서비스와 관련하여 공지한 주의사항, 회사가 통지하는 사항 등을 준수하여야 하며, 기타 회사의 업무에 방해되는 행위를 하여서는 안 됩니다.</li>
                <li>회원은 서비스 이용과 관련하여 다음 각 호의 행위를 하여서는 안 됩니다.
                  <ul className="list-disc pl-5 mt-2">
                    <li>타인의 정보 도용</li>
                    <li>회사 및 제3자의 지적재산권 등 권리 침해</li>
                    <li>AI 시스템의 역설계, 무단 데이터 추출, 기술적 방해 행위</li>
                    <li>허위 정보 등록 및 유포</li>
                    <li>기타 불법적이거나 부당한 행위</li>
                  </ul>
                </li>
              </ol>

              <h2 className="text-2xl font-semibold mt-8 mb-4">제8조 (게시물의 관리)</h2>
              <ol className="list-decimal pl-5">
                <li>회원이 게시하거나 등록한 내용이 다음 각 호에 해당한다고 판단되는 경우, 회사는 사전 통지 없이 삭제할 수 있습니다.
                  <ul className="list-disc pl-5 mt-2">
                    <li>타인에게 모욕을 주거나 명예를 훼손하는 내용</li>
                    <li>공공질서 및 미풍양속에 위반되는 내용</li>
                    <li>범죄 행위와 관련된 내용</li>
                    <li>회사 또는 제3자의 저작권 등 권리를 침해하는 내용</li>
                    <li>기타 관련 법령에 위반되는 내용</li>
                  </ul>
                </li>
              </ol>

              <h2 className="text-2xl font-semibold mt-8 mb-4">제9조 (저작권의 귀속 및 이용제한)</h2>
              <ol className="list-decimal pl-5">
                <li>서비스 내에 게시된 저작물의 저작권은 회사에 귀속되며, 회원은 회사가 허락한 범위 내에서만 이를 이용할 수 있습니다.</li>
                <li>회원이 서비스 내에 게시한 게시물의 저작권은 해당 회원에게 귀속됩니다. 단, 회사는 서비스 운영 및 홍보 목적으로 게시물을 사용할 수 있습니다.</li>
              </ol>

              <h2 className="text-2xl font-semibold mt-8 mb-4">제10조 (계약 해지 및 이용 제한)</h2>
              <ol className="list-decimal pl-5">
                <li>회원은 언제든지 서비스 내 회원 탈퇴 절차를 통해 이용계약을 해지할 수 있습니다.</li>
                <li>회사는 회원이 본 약관 및 관련 법령을 위반하는 경우 사전 통보 없이 이용계약을 해지하거나 서비스 이용을 제한할 수 있습니다.</li>
              </ol>

              <h2 className="text-2xl font-semibold mt-8 mb-4">제11조 (책임의 한계)</h2>
              <ol className="list-decimal pl-5">
                <li>회사는 회원 간 또는 회원과 제3자 상호간에 서비스를 매개로 하여 거래 등을 한 경우에는 책임을 지지 않습니다.</li>
                <li>회사는 인공지능이 제공하는 정보의 정확성, 신뢰성, 완전성을 보장하지 않으며, 이를 토대로 한 회원의 행위에 대해 책임을 지지 않습니다.</li>
                <li>회사는 천재지변, 불가항력적 사유 등으로 인하여 서비스를 제공할 수 없는 경우에는 책임이 면제됩니다.</li>
              </ol>

              <h2 className="text-2xl font-semibold mt-8 mb-4">제12조 (분쟁의 해결)</h2>
              <ol className="list-decimal pl-5">
                <li>회사와 회원 간 분쟁이 발생할 경우, 회사와 회원은 분쟁의 원만한 해결을 위해 성실히 협의합니다.</li>
                <li>분쟁이 해결되지 않을 경우, 관할법원은 회사의 본점 소재지를 관할하는 법원으로 합니다.</li>
              </ol>

              <h2 className="text-2xl font-semibold mt-8 mb-4">제13조 (기타)</h2>
              <ol className="list-decimal pl-5">
                <li>본 약관에 명시되지 않은 사항은 관계 법령 및 회사의 정책에 따릅니다.</li>
                <li>본 약관은 2025년 5월 13일부터 시행합니다.</li>
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