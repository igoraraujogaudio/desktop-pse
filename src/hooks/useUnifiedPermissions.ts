import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';
import { contratoService } from '../services/contratoService';
import { baseService } from '../services/baseService';
import { useModularPermissions } from './useModularPermissions';
import { UsuarioContrato, UsuarioBase } from '../types/contratos';

export function useUnifiedPermissions() {
    const { user, loading: authLoading } = useAuth();
    // We use modular permissions for hasPermission checks
    const { hasPermission: modularHasPermission } = useModularPermissions();

    const [userContratos, setUserContratos] = useState<UsuarioContrato[]>([]);
    const [userBases, setUserBases] = useState<UsuarioBase[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const ACCESS_HIERARCHY = useMemo(() => [
        'admin', 'diretor', 'manager', 'gerente', 'gestor_frota',
        'gestor', 'gestor_almoxarifado', 'coordenador', 'eng_seguranca', 'supervisor',
        'tst', 'rh', 'portaria', 'almoxarifado', 'operacao'
    ], []);

    const loadUserData = useCallback(async () => {
        if (!user?.id) {
            console.log('⏸️ [useUnifiedPermissions] Skipping load - no user ID');
            return;
        }

        if (authLoading) {
            console.log('⏸️ [useUnifiedPermissions] Skipping load - auth still loading');
            return;
        }

        console.log('🔄 [useUnifiedPermissions] Loading user data for:', user.id, user.nome);
        setLoading(true);
        setError(null);

        try {
            console.log('📡 [useUnifiedPermissions] Fetching contratos and bases...');
            const [contratos, bases] = await Promise.all([
                contratoService.getUserContratos(user.id),
                baseService.getUserBases(user.id)
            ]);

            console.log('✅ [useUnifiedPermissions] Contratos loaded:', contratos.length, contratos);
            console.log('✅ [useUnifiedPermissions] Bases loaded:', bases.length, bases);

            setUserContratos(contratos);
            setUserBases(bases);
        } catch (err) {
            console.error('❌ [useUnifiedPermissions] Error loading data:', err);
            setError('Erro ao carregar dados');
        } finally {
            setLoading(false);
        }
    }, [user?.id, authLoading]);

    useEffect(() => {
        loadUserData();
    }, [loadUserData]);

    const hasContratoAccess = useCallback((contratoId: string): boolean => {
        // If admin, true? Not necessarily in contract logic, usually admin sees all. 
        // Web logic checks if found in userContratos.
        // If admin is not in contracts table explicitly, we might need to bypass.
        // Web hook doesn't explicitly bypass for admin in hasContratoAccess, but maybe admin is always added to contracts?
        // Let's assume strict check for now.
        return userContratos.some(uc => uc.contrato_id === contratoId && uc.ativo);
    }, [userContratos]);

    const hasBaseAccess = useCallback((baseId: string): boolean => {
        // Verificar acesso apenas via usuario_bases (permissões modulares)
        return userBases.some(ub => ub.base_id === baseId && ub.ativo);
    }, [userBases]);

    const getBaseAccessType = useCallback((baseId: string): 'total' | 'restrito' | 'leitura' | null => {
        const baseAccess = userBases.find(ub => ub.base_id === baseId && ub.ativo);
        return baseAccess?.tipo_acesso || null;
    }, [userBases]);

    return {
        hasPermission: modularHasPermission, // Delegate to modular
        user,
        userContratos,
        userBases,
        hasContratoAccess,
        hasBaseAccess,
        getBaseAccessType,
        loading: loading || authLoading,
        error,
        ACCESS_HIERARCHY
    };
}
