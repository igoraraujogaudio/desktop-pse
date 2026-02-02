// Tipos básicos para o aplicativo

// User type
export interface User {
  id: string;
  email: string;
  nome: string;
  matricula?: string;
  nivel_acesso?: string;
  ativo?: boolean;
  criado_em?: string;
  atualizado_em?: string;
  permissoes_personalizadas?: boolean;
}

export interface SolicitacaoItem {
  id: string;
  numero_solicitacao?: string;
  item_id: string;
  solicitante_id: string;
  destinatario_id?: string;
  destinatario_equipe_id?: string;
  responsavel_equipe_id?: string;
  base_id: string;
  quantidade_solicitada: number;
  quantidade_aprovada?: number;
  quantidade_entregue?: number;
  status:
  | "pendente"
  | "aprovada"
  | "parcialmente_aprovada"
  | "rejeitada"
  | "entregue"
  | "cancelada"
  | "aguardando_estoque"
  | "devolvida";
  motivo_solicitacao: string;
  tipo_troca?: "fornecimento" | "troca" | "desconto";
  observacoes?: string;
  criado_em: string;
  atualizado_em: string;
  // Dual approval fields
  dupla_aprovacao_completa?: boolean;
  aprovado_almoxarifado_por?: string;
  aprovado_almoxarifado_em?: string;
  aprovado_sesmt_por?: string;
  aprovado_sesmt_em?: string;
  entregue_em?: string;
  assinatura_digital?: string;
  assinatura_nome?: string;
  motivo_rejeicao?: string;
  item?: {
    id: string;
    nome: string;
    codigo: string;
    estoque_atual: number;
  };
  solicitante?: {
    id: string;
    nome: string;
    email?: string;
    matricula?: string;
  };
  destinatario?: {
    id: string;
    nome: string;
    matricula?: string;
  };
  destinatario_equipe?: {
    id: string;
    nome: string;
  };
  responsavel_equipe?: {
    id: string;
    nome: string;
  };
  base?: {
    id: string;
    nome: string;
  };
  evidencia_url?: string;
  evidencia_tipo?: 'foto' | 'arquivo';
}

export interface HistoricoFuncionario {
  id: string;
  funcionario_id: string;
  item_id: string;
  quantidade: number;
  tipo_movimentacao: "entrega" | "devolucao" | "troca" | "substituicao";
  data_entrega: string;
  status:
  | "em_uso"
  | "devolvido"
  | "perdido"
  | "danificado"
  | "vencido"
  | "reteste"
  | "desgaste";
  condicao_entrega?: "novo" | "usado_bom" | "usado_regular" | "danificado";
  observacoes_entrega?: string;
  responsavel_entrega: string;
  funcionario?: {
    id: string;
    nome: string;
    matricula?: string;
  };
  item?: {
    id: string;
    nome: string;
    codigo: string;
  };
}

export interface EntregaData {
  solicitacao: SolicitacaoItem;
  items: Array<{
    nome: string;
    codigo: string;
    quantidade: number;
  }>;
  funcionario: {
    id: string;
    nome: string;
    matricula?: string;
  };
  timestamp: string;
}
export interface OrdemDesconto {
  id: string;
  funcionario_id: string;
  base_id: string;
  descricao: string;
  valor_total: number;
  status: 'pendente' | 'assinada' | 'processada';
  observacoes?: string;
  arquivo_url?: string;
  criado_em: string;
  criado_por: string;
  itens_inventario?: any; // JSONB
  funcionario?: {
    nome: string;
  }
}

export interface DadosTroca {
  condicao: 'bom' | 'desgaste' | 'danificado' | 'reteste' | 'perdido';
  observacoes: string;
  gerarDesconto: boolean;
  inventoryItemId?: string;
  valorDesconto?: number;
  parcelasDesconto?: number;
}
