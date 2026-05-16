"""
Alarma Automática de Ingesta: Verificación de Datos de Proyectos
Detecta proyectos faltantes y líneas P&G inconsistentes antes del 15 de cada mes
"""

import pandas as pd
from datetime import datetime, timedelta
import json
import warnings
import sys
import argparse

warnings.filterwarnings('ignore')

# ============================================================================
# CONFIGURACIÓN
# ============================================================================

# Ruta del archivo Excel
HISTORICO_FILE = r"c:\Users\jmacallister\OneDrive - IC CONSTRUCTORA SAS\Documentos\ICEOS\IC-EOS\Historico.xlsx"

# Fecha límite para verificación
FECHA_LIMITE_DIA = 15

# Teams Webhook URL (actualizar con Microsoft Graph API)
TEAMS_WEBHOOK = "https://outlook.webhook.office.com/webhookb2/..."

# Mapeo de Proyectos a Responsables
RESPONSABLES_PROYECTOS = {
    'WELL': 'dbenavides@icconstructora.co',
    'Madrid': 'dbenavides@icconstructora.co',
    'Mitika 1.1': 'dbenavides@icconstructora.co',
    'Mitika 1.2': 'dbenavides@icconstructora.co',
    'Verde Vivo E3': 'dbenavides@icconstructora.co',
    'Azul Celeste E3': 'dbenavides@icconstructora.co',
    'Azul Turquesa E2': 'dbenavides@icconstructora.co',
    'Gaia': 'aruiz@icconstructora.co',
    'Castilla Living': 'aruiz@icconstructora.co',
    'Castilla Imperial 2A': 'aruiz@icconstructora.co',
    'Praia E2': 'aruiz@icconstructora.co',
    'Reserva De Oporto E 1-2': 'jmanosalva@icconstructora.co',
    'Reserva De Oporto E 3': 'jmanosalva@icconstructora.co',
    'La Hacienda E1': 'jmanosalva@icconstructora.co',
    'Primera Este E3': 'jmanosalva@icconstructora.co',
    'Bosque Central Institucional': 'jmanosalva@icconstructora.co',
}

def verificar_estado_alarmas():
    """Retorna el estado actual de la configuración"""
    return {
        'timestamp': datetime.now().isoformat(),
        'script': 'alarma_proyectos.py',
        'version': '1.0',
        'azure_ad': {
            'tenant_id': '129cb8aa-2444-49b4-acc9-3f6a696f1ff0',
            'client_id': 'a3e3e09a-9bcc-4c58-b6d7-3aefd8bbd744',
            'estado': 'PENDIENTE - Client Secret necesario'
        },
        'responsables_count': len(RESPONSABLES_PROYECTOS),
        'paso_siguiente': 'Copiar Client Secret desde Azure Portal > Traccion-IC > Certificados y secretos'
    }

def main():
    parser = argparse.ArgumentParser(description='Alarma Automática de Ingesta')
    parser.add_argument('--status', action='store_true', help='Ver estado de configuración')
    parser.add_argument('--json', action='store_true', help='Formato JSON')
    args = parser.parse_args()

    if args.status:
        estado = verificar_estado_alarmas()
        if args.json:
            print(json.dumps(estado, indent=2, default=str, ensure_ascii=False))
        else:
            print("\n" + "=" * 80)
            print("📊 ESTADO - ALARMA DE INGESTA")
            print("=" * 80)
            for key, value in estado.items():
                print(f"{key}: {value}")
            print("=" * 80 + "\n")

if __name__ == "__main__":
    main()
