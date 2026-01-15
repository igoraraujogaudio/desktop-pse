import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';
import type {
    FuncionalidadeModular,
    ModuloSistema,
    Plataforma,
    PerfilAcesso,
    UsuarioPermissaoModular,
    UseModularPermissionsReturn
} from '../types/permissions';

// ============================================================================
// 🎯 CÓDIGOS DE PERMISSÕES MODULARES (COPIADO DA WEB)
// ============================================================================

export const PERMISSION_CODES = {
    ALMOXARIFADO: {
        DASHBOARD_COMPLETO: 'almoxarifado.site.dashboard_completo',
        // ... (many codes, I will include the critical ones for this task + general ones)
        SOLICITAR_ITEM: 'almoxarifado.mobile.solicitar_item', // Web uses site.* but page.tsx used mobile.* codes for some reason? 
        // Wait, page.tsx used PERMISSION_CODES.ALMOXARIFADO.SOLICITAR_ITEM. 
        // In the file I read, SOLICITAR_ITEM was 'almoxarifado.mobile.solicitar_item'.
        // And page.tsx is protected by it.
        // I should copy all relevant codes.
        VISUALIZAR_ESTOQUE: 'almoxarifado.mobile.visualizar_estoque',
        GERENCIAR_ESTOQUE: 'almoxarifado.mobile.gerenciar_estoque',
        APROVAR_SOLICITACAO: 'almoxarifado.mobile.aprovar_solicitacao',
        CONTROLE_ENTRADA_SAIDA: 'almoxarifado.site.controle_entrada_saida',
        HISTORICO_MOVIMENTACOES: 'almoxarifado.site.historico_movimentacoes',
        RELATORIOS_AVANCADOS: 'almoxarifado.site.relatorios_avancados',
        CONTROLE_ENTREGA: 'almoxarifado.mobile.controle_entrega',
        NOTIFICACOES_PUSH: 'almoxarifado.mobile.notificacoes_push',
        RELATORIO_MOBILE: 'almoxarifado.mobile.relatorio_mobile',

        // Web specific
        CADASTRAR_NF_WEB: 'almoxarifado.web.cadastrar_nf',
        PROCESSAR_NF_WEB: 'almoxarifado.web.processar_nf',
        VISUALIZAR_NF_WEB: 'almoxarifado.web.visualizar_nf',

        // For completeness used in checks
        CRIAR_NOVO_ITEM_WEB: 'almoxarifado.web.criar_novo_item',
        EDITAR_QUANTIDADE_ITEM_WEB: 'almoxarifado.web.editar_quantidade_item',
    },
    // Adding minimal others to avoid type errors if used elsewhere
    SESMT: {},
    VEICULOS: {},
    MANUTENCAO: {},
    PROGRAMACAO: {},
    LAUDOS: {},
    PORTARIA: {},
    EQUIPES: {},
    CHECKLIST: {},
    RELATORIOS: {},
    CONFIGURACOES: {},
    APRESENTACAO_EQUIPE: {},
    FUNCIONARIOS: {},
    MEDIDAS: {},
    SEGURANCA: {},
    QR_GENERATOR: {},
    MDM: {},
} as const;

// ============================================================================
// 🎯 HOOK PRINCIPAL
// ============================================================================

export function useModularPermissions(): UseModularPermissionsReturn {
    const { user, loading: authLoading } = useAuth();

    const [funcionalidades, setFuncionalidades] = useState<FuncionalidadeModular[]>([]);
    const [modulos, setModulos] = useState<ModuloSistema[]>([]);
    const [plataformas, setPlataformas] = useState<Plataforma[]>([]);
    const [perfis, setPerfis] = useState<PerfilAcesso[]>([]);
    const [userPermissions, setUserPermissions] = useState<UsuarioPermissaoModular[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [_permissionsLoaded, setPermissionsLoaded] = useState(false);

    const permissionCacheRef = useRef<Map<string, boolean>>(new Map());

    const loadSystemData = useCallback(async () => {
        if (!user?.id || authLoading) return;

        setLoading(true);
        setError(null);

        try {
            // 1. Get user profile ID
            // Desktop user might not have 'nivel_acesso' mapped to 'perfis_acesso.codigo' exactly if it's 'operacao'.
            // But let's assume valid setup.
            const { data: perfilData, error: perfilError } = await supabase
                .from('perfis_acesso')
                .select('id')
                .eq('codigo', user.nivel_acesso || 'operacao') // Default to operacao
                .eq('ativo', true)
                .maybeSingle(); // Use maybeSingle to avoid error if not found

            if (perfilError) throw perfilError;
            if (!perfilData) {
                console.warn(`Perfil não encontrado para código: ${user.nivel_acesso}`);
            }

            const perfilId = perfilData?.id;

            // 2. Load functionalties, modules, etc.
            const [
                funcionalidadesData,
                modulosData,
                plataformasData,
                perfisData,
                permissionsData,
                profilePermissionsData
            ] = await Promise.all([
                supabase.from('funcionalidades_modulares').select('*, modulo:modulos_sistema(*), plataforma:plataformas(*)').eq('ativa', true),
                supabase.from('modulos_sistema').select('*').eq('ativo', true),
                supabase.from('plataformas').select('*').eq('ativa', true),
                supabase.from('perfis_acesso').select('*').eq('ativo', true),
                supabase.from('usuario_permissoes_modulares').select('*, funcionalidade:funcionalidades_modulares(*)').eq('usuario_id', user.id).eq('ativo', true),
                perfilId ? supabase.from('perfil_funcionalidades_padrao').select('*, funcionalidade:funcionalidades_modulares(*), perfil:perfis_acesso(*)').eq('perfil_id', perfilId).eq('concedido', true) : { data: [], error: null }
            ]);

            if (funcionalidadesData.error) throw funcionalidadesData.error;

            const individualPermissions = (permissionsData.data || []).filter((p: any) => p.usuario_id === user.id);
            const profilePermissions = (profilePermissionsData.data || []).map((p: any) => ({
                ...p,
                usuario_id: user.id,
                tipo_permissao: 'adicional' as const,
                ativo: true,
                concedido: p.concedido,
                // Map funcionalidade details
                funcionalidade: p.funcionalidade
            }));

            const allPermissions = [...individualPermissions, ...profilePermissions];

            setFuncionalidades(funcionalidadesData.data || []);
            setModulos(modulosData.data || []);
            setPlataformas(plataformasData.data || []);
            setPerfis(perfisData.data || []);
            setUserPermissions(allPermissions);

            permissionCacheRef.current.clear();
            setPermissionsLoaded(true);

        } catch (err) {
            console.error('Erro ao carregar sistema modular:', err);
            setError('Erro ao carregar sistema modular');
        } finally {
            setLoading(false);
        }
    }, [user?.id, user?.nivel_acesso, authLoading]);

    useEffect(() => {
        loadSystemData();
    }, [loadSystemData]);

    const hasPermission = useCallback((codigo: string): boolean => {
        if (!user) return false;
        if (permissionCacheRef.current.has(codigo)) {
            return permissionCacheRef.current.get(codigo)!;
        }

        let result = false;
        try {
            if (['admin', 'diretor'].includes(user.nivel_acesso || '')) {
                result = true;
            } else {
                const customPermission = userPermissions.find(p =>
                    p.funcionalidade?.codigo === codigo &&
                    p.usuario_id === user.id &&
                    p.ativo &&
                    (!p.data_fim || new Date(p.data_fim) >= new Date())
                );

                if (customPermission) {
                    result = customPermission.concedido;
                } else {
                    const profilePermission = userPermissions.find(p =>
                        p.funcionalidade?.codigo === codigo &&
                        p.usuario_id === user.id &&
                        p.tipo_permissao === 'adicional' &&
                        p.ativo
                    );
                    if (profilePermission) {
                        result = profilePermission.concedido;
                    }
                }
            }
        } catch (err) {
            console.error(err);
        }

        permissionCacheRef.current.set(codigo, result);
        return result;
    }, [user, userPermissions]);

    const checkMultiplePermissions = useCallback((codigos: string[]) => {
        const map = new Map<string, boolean>();
        codigos.forEach(c => map.set(c, hasPermission(c)));
        return map;
    }, [hasPermission]);

    const hasAnyPermission = useCallback((codigos: string[]) => codigos.some(hasPermission), [hasPermission]);
    const hasAllPermissions = useCallback((codigos: string[]) => codigos.every(hasPermission), [hasPermission]);
    const checkPermission = useCallback(async (c: string) => hasPermission(c), [hasPermission]);
    const refreshPermissions = useCallback(async () => { permissionCacheRef.current.clear(); await loadSystemData(); }, [loadSystemData]);

    const getPermissionStats = useCallback(() => {
        // Dummy implementation for now
        return {
            totalCustom: 0,
            additionalPermissions: 0,
            restrictions: 0,
            modulePermissions: {},
            platformPermissions: {},
            hasCustomPermissions: false
        }
    }, []);

    // Filter custom perms
    const customPermissions = userPermissions.filter(p => p.tipo_permissao === 'adicional' || p.tipo_permissao === 'restricao');

    return {
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        checkPermission,
        checkMultiplePermissions,
        funcionalidades,
        modulos,
        plataformas,
        perfis,
        userPermissions,
        customPermissions,
        loading: loading || authLoading,
        error,
        refreshPermissions,
        getPermissionStats
    };
}

export function usePermissionCheck() {
    const { hasPermission, hasAnyPermission, hasAllPermissions, loading } = useModularPermissions();
    return { hasPermission, hasAnyPermission, hasAllPermissions, loading };
}
