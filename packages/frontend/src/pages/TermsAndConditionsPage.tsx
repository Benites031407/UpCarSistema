import React from 'react';
import { Link } from 'react-router-dom';

export const TermsAndConditionsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 relative overflow-hidden">
      {/* Animated background circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 bg-orange-500/10 rounded-full -top-48 -left-48 animate-pulse"></div>
        <div className="absolute w-64 h-64 bg-orange-500/5 rounded-full top-1/4 -right-32 animate-bounce" style={{ animationDuration: '3s' }}></div>
        <div className="absolute w-80 h-80 bg-orange-600/10 rounded-full bottom-0 left-1/4 animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Header */}
      <header className="bg-gradient-to-r from-orange-600 to-orange-500 shadow-lg sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link to="/" className="p-2 hover:bg-orange-700 rounded-lg transition-colors">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            
            <div className="flex items-center">
              <img 
                src="/assets/upcar-logo-preto.png" 
                alt="UpCar Aspiradores" 
                className="h-12 w-auto"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    parent.innerHTML = '<div class="text-white text-center"><h1 class="text-xl font-bold">UpCar</h1><p class="text-xs text-orange-100">Aspiradores</p></div>';
                  }
                }}
              />
            </div>
            
            <div className="w-10"></div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Termos e Condições de Uso
          </h1>
          <p className="text-gray-600 mb-8">
            <strong>Última atualização:</strong> [DATA]
          </p>

          <div className="prose prose-orange max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">1. ACEITAÇÃO DOS TERMOS</h2>
              <p className="text-gray-700 leading-relaxed">
                Ao acessar e utilizar os serviços da UpCar Aspiradores, você concorda em cumprir e estar vinculado aos seguintes termos e condições de uso.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">2. DESCRIÇÃO DO SERVIÇO</h2>
              <p className="text-gray-700 leading-relaxed">
                A UpCar Aspiradores oferece serviços de aluguel de aspiradores automotivos por meio de máquinas self-service operadas por pagamento.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">3. CADASTRO E CONTA DO USUÁRIO</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                <strong>3.1.</strong> Para utilizar nossos serviços, você deve criar uma conta fornecendo informações precisas e completas.
              </p>
              <p className="text-gray-700 leading-relaxed mb-3">
                <strong>3.2.</strong> Você é responsável por manter a confidencialidade de sua senha e conta.
              </p>
              <p className="text-gray-700 leading-relaxed">
                <strong>3.3.</strong> Você concorda em notificar imediatamente a UpCar sobre qualquer uso não autorizado de sua conta.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">4. USO DO SERVIÇO</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                <strong>4.1.</strong> Os aspiradores devem ser utilizados apenas para limpeza de veículos.
              </p>
              <p className="text-gray-700 leading-relaxed mb-3">
                <strong>4.2.</strong> É proibido danificar, modificar ou tentar burlar os equipamentos.
              </p>
              <p className="text-gray-700 leading-relaxed mb-3">
                <strong>4.3.</strong> O tempo de uso é limitado conforme o pagamento realizado.
              </p>
              <p className="text-gray-700 leading-relaxed">
                <strong>4.4.</strong> O usuário é responsável por qualquer dano causado ao equipamento durante o uso.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">5. PAGAMENTOS E CRÉDITOS</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                <strong>5.1.</strong> Os pagamentos podem ser realizados via PIX ou créditos da conta.
              </p>
              <p className="text-gray-700 leading-relaxed mb-3">
                <strong>5.2.</strong> Os créditos adicionados à conta não são reembolsáveis.
              </p>
              <p className="text-gray-700 leading-relaxed mb-3">
                <strong>5.3.</strong> O tempo não utilizado não será reembolsado.
              </p>
              <p className="text-gray-700 leading-relaxed">
                <strong>5.4.</strong> Todos os preços estão sujeitos a alterações sem aviso prévio.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">6. RESPONSABILIDADES DO USUÁRIO</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                <strong>6.1.</strong> Utilizar o equipamento de forma adequada e segura.
              </p>
              <p className="text-gray-700 leading-relaxed mb-3">
                <strong>6.2.</strong> Não permitir que terceiros utilizem sua conta.
              </p>
              <p className="text-gray-700 leading-relaxed mb-3">
                <strong>6.3.</strong> Respeitar o tempo de uso contratado.
              </p>
              <p className="text-gray-700 leading-relaxed">
                <strong>6.4.</strong> Reportar imediatamente qualquer problema com o equipamento.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">7. LIMITAÇÃO DE RESPONSABILIDADE</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                <strong>7.1.</strong> A UpCar não se responsabiliza por danos ao veículo causados pelo mau uso do equipamento.
              </p>
              <p className="text-gray-700 leading-relaxed mb-3">
                <strong>7.2.</strong> A UpCar não garante a disponibilidade ininterrupta dos serviços.
              </p>
              <p className="text-gray-700 leading-relaxed">
                <strong>7.3.</strong> A UpCar não se responsabiliza por perda de dados ou interrupções no serviço.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">8. PRIVACIDADE</h2>
              <p className="text-gray-700 leading-relaxed">
                O tratamento de dados pessoais está descrito em nossa{' '}
                <Link to="/politica-de-privacidade" className="text-orange-600 hover:text-orange-700 font-medium underline">
                  Política de Privacidade
                </Link>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">9. MODIFICAÇÕES DOS TERMOS</h2>
              <p className="text-gray-700 leading-relaxed">
                A UpCar reserva-se o direito de modificar estes termos a qualquer momento. As alterações entrarão em vigor imediatamente após a publicação.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">10. RESCISÃO</h2>
              <p className="text-gray-700 leading-relaxed">
                A UpCar pode suspender ou encerrar sua conta a qualquer momento por violação destes termos.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">11. LEI APLICÁVEL</h2>
              <p className="text-gray-700 leading-relaxed">
                Estes termos são regidos pelas leis brasileiras.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">12. CONTATO</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                Para questões sobre estes termos, entre em contato:
              </p>
              <ul className="list-none space-y-2 text-gray-700">
                <li>
                  <strong>WhatsApp:</strong>{' '}
                  <a href="https://wa.me/5511948580070" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:text-orange-700 underline">
                    +55 11 94858-0070
                  </a>
                </li>
                <li>
                  <strong>Email:</strong> [EMAIL]
                </li>
              </ul>
            </section>

            <div className="border-t border-gray-200 pt-6 mt-8">
              <p className="text-gray-600 text-center">
                <strong>UpCar Aspiradores</strong>
              </p>
            </div>
          </div>

          {/* Back Button */}
          <div className="mt-8 text-center">
            <Link 
              to="/" 
              className="inline-block bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg"
            >
              Voltar ao Início
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};
