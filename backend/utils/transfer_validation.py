"""
Utilitários para validação de dados de transferências
"""
import json
from typing import List, Dict, Any, Optional
from decimal import Decimal

class TransferValidationError(Exception):
    """Erro de validação de transferência"""
    pass

class TransferenciaValidator:
    """Validador para dados de transferências"""

    @staticmethod
    def validar_id_proprietarios_json(json_str: str) -> List[Dict[str, Any]]:
        """
        Valida e converte o JSON de id_proprietarios

        Args:
            json_str: String JSON com a estrutura [{"id": int, "valor": float}, ...]

        Returns:
            Lista validada de dicionários

        Raises:
            TransferValidationError: Se o JSON for inválido
        """
        if not json_str or not json_str.strip():
            return []

        try:
            data = json.loads(json_str)
        except json.JSONDecodeError as e:
            raise TransferValidationError(f"JSON inválido: {str(e)}")

        if not isinstance(data, list):
            raise TransferValidationError("id_proprietarios deve ser uma lista")

        validated_data = []
        for i, item in enumerate(data):
            if not isinstance(item, dict):
                raise TransferValidationError(f"Item {i} deve ser um objeto")

            if 'id' not in item:
                raise TransferValidationError(f"Item {i} deve ter campo 'id'")

            if 'valor' not in item:
                raise TransferValidationError(f"Item {i} deve ter campo 'valor'")

            try:
                proprietario_id = int(item['id'])
                if proprietario_id <= 0:
                    raise ValueError("ID deve ser positivo")
            except (ValueError, TypeError):
                raise TransferValidationError(f"Item {i}: 'id' deve ser um inteiro positivo")

            try:
                valor = float(item['valor'])
            except (ValueError, TypeError):
                raise TransferValidationError(f"Item {i}: 'valor' deve ser um número")

            validated_data.append({
                'id': proprietario_id,
                'valor': valor
            })

        return validated_data

    @staticmethod
    def calcular_soma_transferencia(id_proprietarios_data: List[Dict[str, Any]]) -> float:
        """
        Calcula a soma dos valores individuais de uma transferência

        Args:
            id_proprietarios_data: Lista de dicionários com id e valor

        Returns:
            Soma dos valores (float)
        """
        return sum(item['valor'] for item in id_proprietarios_data)

    @staticmethod
    def validar_transferencia_completa(
        nome_transferencia: str,
        id_proprietarios_json: Optional[str],
        alias_id: int
    ) -> Dict[str, Any]:
        """
        Valida uma transferência completa

        Args:
            nome_transferencia: Nome da transferência
            id_proprietarios_json: JSON com os dados dos proprietários
            alias_id: ID do alias

        Returns:
            Dicionário com dados validados

        Raises:
            TransferValidationError: Se houver erro de validação
        """
        # Validar nome
        if not nome_transferencia or not nome_transferencia.strip():
            raise TransferValidationError("Nome da transferência é obrigatório")

        if len(nome_transferencia.strip()) < 2:
            raise TransferValidationError("Nome da transferência deve ter pelo menos 2 caracteres")

        # Validar alias_id
        if not alias_id or alias_id <= 0:
            raise TransferValidationError("Alias ID deve ser um inteiro positivo")

        # Validar e processar id_proprietarios
        id_proprietarios_data = TransferenciaValidator.validar_id_proprietarios_json(id_proprietarios_json or "")

        # Calcular soma
        soma_calculada = TransferenciaValidator.calcular_soma_transferencia(id_proprietarios_data)

        return {
            'nome_transferencia': nome_transferencia.strip(),
            'id_proprietarios_data': id_proprietarios_data,
            'id_proprietarios_json': json.dumps(id_proprietarios_data) if id_proprietarios_data else None,
            'soma_calculada': soma_calculada,
            'alias_id': alias_id
        }

    @staticmethod
    def verificar_consistencia_transferencia(
        valor_total_registrado: float,
        id_proprietarios_json: Optional[str],
        tolerancia: float = 0.01
    ) -> Dict[str, Any]:
        """
        Verifica se o valor_total registrado é consistente com a soma calculada

        Args:
            valor_total_registrado: Valor total armazenado no banco
            id_proprietarios_json: JSON com dados dos proprietários
            tolerancia: Tolerância para comparação (padrão: 0.01)

        Returns:
            Dicionário com resultado da verificação
        """
        try:
            id_proprietarios_data = TransferenciaValidator.validar_id_proprietarios_json(id_proprietarios_json or "")
            soma_calculada = TransferenciaValidator.calcular_soma_transferencia(id_proprietarios_data)

            consistente = abs(valor_total_registrado - soma_calculada) < tolerancia

            return {
                'consistente': consistente,
                'valor_registrado': valor_total_registrado,
                'soma_calculada': soma_calculada,
                'diferenca': abs(valor_total_registrado - soma_calculada),
                'dados_validos': True
            }

        except TransferValidationError:
            return {
                'consistente': False,
                'valor_registrado': valor_total_registrado,
                'soma_calculada': None,
                'diferenca': None,
                'dados_validos': False,
                'erro': "Dados JSON inválidos"
            }