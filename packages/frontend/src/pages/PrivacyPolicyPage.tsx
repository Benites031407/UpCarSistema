import React from 'react';
import { Link } from 'react-router-dom';

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
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
            Política de Privacidade
          </h1>
          <p className="text-gray-600 mb-8">
            <strong>Última atualização:</strong> [DATA]
          </p>

          <div className="prose prose-orange max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">1. INTRODUÇÃO</h2>
              <p className="text-gray-700 leading-relaxed">
                A UpCar Aspiradores ("nós", "nosso" ou "UpCar") respeita sua privacidade e está comprometida em proteger seus dados pessoais. Esta política descreve como coletamos, usamos e protegemos suas informações.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">2. INFORMAÇÕES QUE COLETAMOS</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-2 mt-4">2.1. Informações Fornecidas por Você</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                <li>Nome completo</li>
                <li>Endereço de e-mail</li>
                <li>Número de telefone</li>
                <li>Informações de pagamento</li>
                <li>Histórico de transações</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-2 mt-4">2.2. Informações Coletadas Automaticamente</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                <li>Endereço IP</li>
                <li>Tipo de dispositivo e navegador</li>
                <li>Localização geográfica aproximada</li>
                <li>Horários de acesso</li>
                <li>Páginas visitadas</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-2 mt-4">2.3. Informações de Uso</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                <li>Máquinas utilizadas</li>
                <li>Duração de uso</li>
                <li>Métodos de pagamento utilizados</li>
                <li>Histórico de sessões</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">3. COMO USAMOS SUAS INFORMAÇÕES</h2>
              <p className="text-gray-700 leading-relaxed mb-3">Utilizamos suas informações para:</p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>Fornecer e melhorar nossos serviços</li>
                <li>Processar pagamentos e transações</li>
                <li>Enviar notificações sobre seu uso</li>
                <li>Prevenir fraudes e garantir segurança</li>
                <li>Cumprir obrigações legais</li>
                <li>Análise e melhoria dos serviços</li>
                <li>Suporte ao cliente</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">4. COMPARTILHAMENTO DE INFORMAÇÕES</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-2 mt-4">4.1. Não Vendemos Seus Dados</h3>
              <p className="text-gray-700 leading-relaxed">
                Nunca vendemos suas informações pessoais a terceiros.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-2 mt-4">4.2. Compartilhamento Necessário</h3>
              <p className="text-gray-700 leading-relaxed mb-2">Podemos compartilhar informações com:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                <li>Processadores de pagamento (PIX, bancos)</li>
                <li>Provedores de serviços de tecnologia</li>
                <li>Autoridades legais quando exigido por lei</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">5. SEGURANÇA DOS DADOS</h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>Utilizamos criptografia SSL/TLS para proteger dados em trânsito</li>
                <li>Armazenamento seguro em servidores protegidos</li>
                <li>Acesso restrito aos dados pessoais</li>
                <li>Monitoramento contínuo de segurança</li>
                <li>Backups regulares e seguros</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">6. SEUS DIREITOS (LGPD)</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem direito a:
              </p>
              <ul className="list-none space-y-2 text-gray-700">
                <li><strong>6.1. Acesso:</strong> Solicitar cópia de seus dados pessoais</li>
                <li><strong>6.2. Correção:</strong> Corrigir dados incompletos ou incorretos</li>
                <li><strong>6.3. Exclusão:</strong> Solicitar a exclusão de seus dados</li>
                <li><strong>6.4. Portabilidade:</strong> Receber seus dados em formato estruturado</li>
                <li><strong>6.5. Revogação:</strong> Revogar consentimento a qualquer momento</li>
                <li><strong>6.6. Informação:</strong> Saber com quem compartilhamos seus dados</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">7. RETENÇÃO DE DADOS</h2>
              <ul className="list-none space-y-2 text-gray-700">
                <li><strong>7.1.</strong> Mantemos seus dados pelo tempo necessário para fornecer os serviços</li>
                <li><strong>7.2.</strong> Dados de transações são mantidos conforme exigido por lei (mínimo 5 anos)</li>
                <li><strong>7.3.</strong> Você pode solicitar a exclusão de dados a qualquer momento</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">8. COOKIES E TECNOLOGIAS SIMILARES</h2>
              <ul className="list-none space-y-2 text-gray-700">
                <li><strong>8.1.</strong> Utilizamos cookies para melhorar a experiência do usuário</li>
                <li><strong>8.2.</strong> Cookies essenciais para funcionamento do serviço</li>
                <li><strong>8.3.</strong> Cookies de análise para melhorar nossos serviços</li>
                <li><strong>8.4.</strong> Você pode desabilitar cookies nas configurações do navegador</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">9. MENORES DE IDADE</h2>
              <ul className="list-none space-y-2 text-gray-700">
                <li><strong>9.1.</strong> Nossos serviços são destinados a maiores de 18 anos</li>
                <li><strong>9.2.</strong> Não coletamos intencionalmente dados de menores de idade</li>
                <li><strong>9.3.</strong> Se identificarmos dados de menores, serão excluídos imediatamente</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">10. ALTERAÇÕES NESTA POLÍTICA</h2>
              <ul className="list-none space-y-2 text-gray-700">
                <li><strong>10.1.</strong> Podemos atualizar esta política periodicamente</li>
                <li><strong>10.2.</strong> Notificaremos sobre alterações significativas</li>
                <li><strong>10.3.</strong> O uso continuado após alterações constitui aceitação</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">11. TRANSFERÊNCIA INTERNACIONAL DE DADOS</h2>
              <ul className="list-none space-y-2 text-gray-700">
                <li><strong>11.1.</strong> Seus dados são armazenados em servidores no Brasil</li>
                <li><strong>11.2.</strong> Caso haja transferência internacional, garantimos proteção adequada</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">12. ENCARREGADO DE DADOS (DPO)</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                Para exercer seus direitos ou esclarecer dúvidas sobre privacidade:
              </p>
              <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg">
                <p className="text-gray-800 font-semibold mb-2">Encarregado de Proteção de Dados</p>
                <ul className="list-none space-y-1 text-gray-700">
                  <li>
                    <strong>Email:</strong> [EMAIL_DPO]
                  </li>
                  <li>
                    <strong>WhatsApp:</strong>{' '}
                    <a href="https://wa.me/5511948580070" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:text-orange-700 underline">
                      +55 11 94858-0070
                    </a>
                  </li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">13. AUTORIDADE DE PROTEÇÃO DE DADOS</h2>
              <p className="text-gray-700 leading-relaxed">
                Você tem o direito de apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD):{' '}
                <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:text-orange-700 underline">
                  www.gov.br/anpd
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">14. CONSENTIMENTO</h2>
              <p className="text-gray-700 leading-relaxed">
                Ao utilizar nossos serviços, você consente com esta Política de Privacidade.
              </p>
            </section>

            <div className="border-t border-gray-200 pt-6 mt-8">
              <p className="text-gray-600 text-center mb-4">
                <strong>UpCar Aspiradores</strong>
                <br />
                Desenvolvido por: Cube³ Tecnologia
              </p>
              <p className="text-gray-600 text-center">
                <strong>Contato:</strong>
                <br />
                WhatsApp:{' '}
                <a href="https://wa.me/5511948580070" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:text-orange-700 underline">
                  +55 11 94858-0070
                </a>
                <br />
                Email: [EMAIL]
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
