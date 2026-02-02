export const discountOrderTemplate = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>AUTORIZAÇÃO DE DESCONTO DE MATERIAL</title>
  <style>
    body {
      font-family: Arial, Helvetica, sans-serif;
      margin: 32px 40px 32px 40px;
      color: #222;
      font-size: 14px;
    }
    .header {
      display: flex;
      align-items: stretch;
      border: 2.5px solid #222;
      border-radius: 4px;
      margin-bottom: 24px;
      background: #fff;
      height: 64px;
    }
    .logo {
      width: 160px;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      background: none;
      border-right: 2.5px solid #222;
    }
    .logo img {
      max-width: 90%;
      max-height: 80%;
      object-fit: contain;
    }
    .header-title {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      font-weight: bold;
      background: #fff;
      border-left: none;
      padding: 0;
      letter-spacing: 0.5px;
    }
    .desc {
      margin-bottom: 10px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 12px;
    }
    .items-table th,
    .items-table td {
      border: 1px solid #222;
      padding: 8px;
      text-align: left;
    }
    .items-table th {
      background-color: #f5f5f5;
      font-weight: bold;
      text-align: center;
    }
    .items-table .text-center {
      text-align: center;
    }
    .items-table .text-right {
      text-align: right;
    }
    .items-table .item-name {
      font-weight: bold;
    }
    .items-table .item-motive {
      font-size: 11px;
      color: #666;
    }
    .total-row {
      background-color: #f9f9f9;
      font-weight: bold;
    }
    .desc {
      margin-bottom: 10px;
    }
    .desc strong {
      font-weight: bold;
      font-size: 15px;
    }
    .desc .highlight {
      color: #222;
      font-weight: bold;
      font-style: italic;
      text-decoration: underline;
    }
    .desc .green {
      color: #008000;
      font-weight: bold;
      font-style: italic;
    }
    .desc .underline {
      text-decoration: underline;
    }
    .desc .os {
      font-weight: bold;
    }
    .desc .date {
      font-weight: bold;
    }
    .section-title {
      font-weight: bold;
      margin-top: 18px;
      margin-bottom: 4px;
    }
    .docs-list {
      margin: 0 0 10px 0;
      padding-left: 18px;
    }
    .docs-list li {
      margin-bottom: 2px;
    }
    .docs-list .italic {
      font-style: italic;
    }
    .signature {
      margin-top: 36px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .signature-block {
      text-align: center;
      flex: 1;
    }
    .signature-block .line {
      border-bottom: 1.5px solid #222;
      width: 260px;
      margin: 0 auto 2px auto;
      height: 24px;
    }
    .signature-block .label {
      font-size: 12px;
      color: #222;
    }
    .signature-block .matricula {
      font-size: 12px;
      color: #222;
      margin-top: 2px;
    }
    .testemunhas {
      margin-top: 36px;
      margin-bottom: 16px;
    }
    .testemunhas-title {
      font-weight: bold;
      text-align: center;
      margin-bottom: 8px;
    }
    .testemunha-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
    }
    .testemunha-table td {
      padding: 0 4px;
      font-size: 13px;
      vertical-align: bottom;
    }
    .testemunha-table .assinatura {
      border-bottom: 1.5px solid #222;
      height: 24px;
      min-width: 180px;
    }
    .testemunha-table .label {
      font-size: 12px;
      color: #222;
      text-align: center;
      padding-top: 2px;
    }
    .testemunha-table .assinatura-nome {
      border-bottom: 1.5px solid #222;
      height: 24px;
      min-width: 240px;
    }
    .testemunha-table .assinatura-cpf {
      border-bottom: 1.5px solid #222;
      height: 24px;
      min-width: 100px;
    }
    .footer-signatures {
      margin-top: 36px;
      text-align: center;
      font-weight: bold;
      font-size: 15px;
      position: relative;
    }
    .footer-signatures .line {
      border-bottom: 1.5px solid #222;
      width: 340px;
      margin: 0 auto 2px auto;
      height: 24px;
      display: block;
    }
    .footer-company {
      margin-top: 24px;
      text-align: center;
      font-size: 13px;
      font-weight: bold;
    }
    .footer-company .sub {
      font-size: 12px;
      font-weight: normal;
    }
    .footer-code {
      margin-top: 18px;
      text-align: right;
      font-size: 10px;
      color: #888;
    }
    .bold { font-weight: bold; }
    .italic { font-style: italic; }
    .underline { text-decoration: underline; }
    .center { text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">
      <!-- Image will be added via addImage -->
    </div>
    <div class="header-title">AUTORIZAÇÃO DE DESCONTO DE MATERIAL</div>
  </div>
  <div class="desc">
    Eu, <span class="bold italic">{{nome_colaborador}}</span>, CPF <span class="bold underline">{{cpf}}</span>, autorizo a empresa <span class="bold">PSE – Projetos e Serviços de Engenharia Ltda</span>, a efetuar desconto em minha remuneração mensal, o valor descrito abaixo correspondente à reparação dos danos/avarias por mim provocado, conforme fatos e comprovantes e despesas anexo.<br>
    <span class="bold">Descrição:</span> {{descricao}}<br><br>
    
    <!-- Tabela de Itens -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 40%;">Item</th>
          <th style="width: 10%;">Qtd</th>
          <th style="width: 15%;">Valor Unit.</th>
          <th style="width: 15%;">Valor Total</th>
          <th style="width: 20%;">Motivo</th>
        </tr>
      </thead>
      <tbody>
        {{itens_tabela}}
      </tbody>
      <tfoot>
        <tr class="total-row">
          <td colspan="3" class="text-right"><strong>TOTAL GERAL:</strong></td>
          <td class="text-right"><strong>R\${{ valor_total }}</strong></td>
          <td></td>
        </tr>
      </tfoot>
    </table>
    
    <span class="bold">Valor total do desconto: R\${{ valor_total }} ({{valor_total_extenso}})</span><br>
    <span class="bold">Valor total a ser desconto: R\${{ valor_total }} ({{valor_total_extenso}})</span><br><br>
    <span class="section-title">Documentos comprobatórios:</span>
    <ul class="docs-list">
      {{documentos_comprobatórios}}
    </ul>
  </div>
  <div class="desc">
    Declaro estar ciente e de acordo com o desconto efetivado, bem como, a lisura com que foi apurado o fato, não restando qualquer dúvida quanto a avaria por mim provocada e o valor efetivamente gasto para repará-la, estando, assim, todo o procedimento de apuração e comprovação pautado na inteligência do artigo 462, § 1º da Consolidação das Lei dos Trabalho, pelo que declaro estar de acordo, firmando a presente.
    <br>
  </div>
  <div class="signature">
    <div class="signature-block">
      <div class="line"></div>
      <div class="label">(Assinatura do Empregado)</div>
      <div class="matricula">Matrícula</div>
    </div>
    <div style="flex:1"></div>
    <div class="signature-block">
      <div class="label">{{estado_base}}, <span class="date">{{data_geracao}}</span></div>
    </div>
  </div>
  <div class="testemunhas">
    <div class="testemunhas-title">Testemunhas</div>
    <table class="testemunha-table">
      <tr>
        <td style="width:24px; vertical-align:bottom;">1:</td>
        <td class="assinatura-nome"></td>
        <td style="width:16px; text-align:center; vertical-align:bottom;">/</td>
        <td class="assinatura-cpf"></td>
      </tr>
      <tr>
        <td></td>
        <td class="label" style="text-align:center;">Nome</td>
        <td></td>
        <td class="label" style="text-align:center;">CPF</td>
      </tr>
      <tr>
        <td style="width:24px; vertical-align:bottom;">2:</td>
        <td class="assinatura-nome"></td>
        <td style="width:16px; text-align:center; vertical-align:bottom;">/</td>
        <td class="assinatura-cpf"></td>
      </tr>
      <tr>
        <td></td>
        <td class="label" style="text-align:center;">Nome</td>
        <td></td>
        <td class="label" style="text-align:center;">CPF</td>
      </tr>
    </table>
  </div>
  <div class="footer-signatures">
    <span class="line"></span>
    (ASSINATURA DO GESTOR/GERENTE DA UNIDADE)
  </div>
  <div class="footer-company">
    PSE – Projetos e Serviços de Engenharia LTDA<br>
    <span class="sub">(ASSINATURA DA DIRETORIA)</span>
  </div>
  <div class="footer-code">
    RH-F-031 03 01/06/2020
  </div>
</body>
</html>`;
