import { supabase } from '../lib/supabase'
import type {
  EmpresaTerceira,
  EmprestimoTerceiroAtivo,
  CriarEmpresaTerceiraDTO,
  CriarEmprestimoTerceiroDTO,
  RegistrarDevolucaoDTO,
  HistoricoEmprestimoLog,
  Base,
  ItemEstoque
} from '../types/emprestimos-terceiros'

export const emprestimosTerceirosService = {
  async getEmpresas(): Promise<EmpresaTerceira[]> {
    const { data, error } = await supabase
      .from('empresas_terceiras')
      .select('*')
      .order('razao_social')
    
    if (error) throw error
    return data || []
  },

  async getEmprestimos(): Promise<EmprestimoTerceiroAtivo[]> {
    const { data, error } = await supabase
      .from('vw_emprestimos_terceiros_ativos')
      .select('*')
      .order('data_emprestimo', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  async getBases(): Promise<Base[]> {
    const { data, error } = await supabase
      .from('bases')
      .select('*')
      .order('nome')
    
    if (error) throw error
    return data || []
  },

  async getItensEstoque(): Promise<ItemEstoque[]> {
    const { data, error } = await supabase
      .from('itens_estoque')
      .select('*')
      .eq('status', 'ativo')
      .order('nome')
    
    if (error) throw error
    return data || []
  },

  async getHistorico(): Promise<HistoricoEmprestimoLog[]> {
    const { data, error } = await supabase
      .from('historico_emprestimos_terceiros')
      .select(`
        *,
        usuario:usuarios!historico_emprestimos_terceiros_usuario_id_fkey(id, nome, email),
        emprestimo:emprestimos_terceiros!historico_emprestimos_terceiros_emprestimo_id_fkey(
          numero_documento,
          empresa_terceira:empresas_terceiras(razao_social),
          item_estoque:itens_estoque(nome, codigo)
        )
      `)
      .order('criado_em', { ascending: false })
      .limit(100)
    
    if (error) throw error
    return data || []
  },

  async criarEmpresa(dto: CriarEmpresaTerceiraDTO): Promise<void> {
    const insertData: Record<string, string | null> = {
      razao_social: dto.razao_social,
      nome_fantasia: dto.nome_fantasia || null,
      observacoes: dto.observacoes || null
    }
    
    if (dto.cnpj && dto.cnpj.trim() !== '') {
      insertData.cnpj = dto.cnpj.trim()
    }
    
    const { error } = await supabase
      .from('empresas_terceiras')
      .insert([insertData])
    
    if (error) throw error
  },

  async atualizarEmpresa(id: string, dto: Partial<CriarEmpresaTerceiraDTO>, cnpjOriginal?: string): Promise<void> {
    const updateData: Partial<CriarEmpresaTerceiraDTO> = {
      razao_social: dto.razao_social,
      nome_fantasia: dto.nome_fantasia || undefined,
      observacoes: dto.observacoes || undefined
    }
    
    if (dto.cnpj !== cnpjOriginal) {
      updateData.cnpj = dto.cnpj ? dto.cnpj.trim() : undefined
    }
    
    const { error } = await supabase
      .from('empresas_terceiras')
      .update(updateData)
      .eq('id', id)
    
    if (error) throw error
  },

  async criarEmprestimo(dto: CriarEmprestimoTerceiroDTO, userId: string): Promise<string> {
    const { data: numeroData, error: numeroError } = await supabase
      .rpc('gerar_numero_emprestimo_terceiro')
    
    if (numeroError) throw numeroError

    const { error } = await supabase
      .from('emprestimos_terceiros')
      .insert([{
        ...dto,
        numero_documento: numeroData,
        usuario_responsavel_id: userId
      }])
    
    if (error) throw error
    
    return numeroData
  },

  async registrarDevolucao(dto: RegistrarDevolucaoDTO, emprestimo: EmprestimoTerceiroAtivo, userId: string): Promise<'total' | 'parcial'> {
    const novaQuantidadeDevolvida = (emprestimo.quantidade_devolvida || 0) + dto.quantidade_devolvida
    const quantidadeTotal = emprestimo.quantidade || 0
    const novoStatus = novaQuantidadeDevolvida >= quantidadeTotal ? 'devolvido' : 'ativo'

    const { error } = await supabase
      .from('emprestimos_terceiros')
      .update({
        quantidade_devolvida: novaQuantidadeDevolvida,
        data_devolucao_real: dto.data_devolucao || new Date().toISOString().split('T')[0],
        condicao_devolucao: dto.condicao_devolucao,
        observacoes_devolucao: dto.observacoes_devolucao,
        status: novoStatus,
        recebido_por_id: userId
      })
      .eq('id', dto.emprestimo_id)
    
    if (error) throw error
    
    return novoStatus === 'devolvido' ? 'total' : 'parcial'
  }
}
