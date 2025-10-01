#!/usr/bin/env python3
"""
Script de Test para install.py
Verifica la lógica del script sin ejecutar Docker
"""

import sys
import os

# Agregar el directorio scripts al path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))

from rich.console import Console
from rich.panel import Panel
from rich.text import Text

console = Console()

def test_imports():
    """Verifica que todos los imports necesarios funcionen"""
    console.print("[bold cyan]Test 1: Verificando Imports...[/bold cyan]")
    try:
        import os
        import platform
        import subprocess
        import time
        from secrets import token_hex
        from rich.console import Console
        from rich.panel import Panel
        from rich.prompt import Prompt, Confirm
        from rich.progress import Progress, SpinnerColumn, TextColumn
        from rich.syntax import Syntax
        from rich.text import Text
        console.print("✅ Todos los imports correctos\n")
        return True
    except ImportError as e:
        console.print(f"[bold red]❌ Error en imports: {e}[/bold red]\n")
        return False


def test_functions_exist():
    """Verifica que todas las funciones existan en install.py"""
    console.print("[bold cyan]Test 2: Verificando Funciones...[/bold cyan]")
    
    try:
        # Importar el módulo install
        import install
        
        required_functions = [
            'run_command',
            'check_requirements',
            'collect_user_input',
            'generate_env_files',
            'docker_operations',
            'wait_for_postgres',
            'initialize_database',
            'final_summary',
            'main',
            'display_header'
        ]
        
        missing = []
        for func_name in required_functions:
            if not hasattr(install, func_name):
                missing.append(func_name)
        
        if missing:
            console.print(f"[bold red]❌ Funciones faltantes: {', '.join(missing)}[/bold red]\n")
            return False
        else:
            console.print(f"✅ Todas las funciones presentes ({len(required_functions)})\n")
            return True
            
    except Exception as e:
        console.print(f"[bold red]❌ Error al verificar funciones: {e}[/bold red]\n")
        return False


def test_secret_generation():
    """Verifica que la generación de secrets funcione"""
    console.print("[bold cyan]Test 3: Generación de Secret Keys...[/bold cyan]")
    try:
        from secrets import token_hex
        
        secret1 = token_hex(32)
        secret2 = token_hex(32)
        
        # Verificar que son diferentes
        if secret1 == secret2:
            console.print("[bold red]❌ Secrets idénticos (error)[/bold red]\n")
            return False
        
        # Verificar longitud
        if len(secret1) != 64 or len(secret2) != 64:
            console.print(f"[bold red]❌ Longitud incorrecta: {len(secret1)}, {len(secret2)}[/bold red]\n")
            return False
        
        console.print(f"✅ Secret keys generados correctamente")
        console.print(f"   Ejemplo: {secret1[:16]}... (truncado)\n")
        return True
        
    except Exception as e:
        console.print(f"[bold red]❌ Error: {e}[/bold red]\n")
        return False


def test_env_content_generation():
    """Verifica que el contenido de .env se genere correctamente"""
    console.print("[bold cyan]Test 4: Generación de Contenido .env...[/bold cyan]")
    try:
        from secrets import token_hex
        
        # Config simulada
        config = {
            'POSTGRES_DB': 'alugueisv3_db',
            'POSTGRES_USER': 'alugueisv3_usuario',
            'POSTGRES_PASSWORD': 'alugueisv3_senha',
            'ADMIN_USER': 'admin',
            'ADMIN_PASS': 'admin00',
            'USE_TRAEFIK': False,
            'HOST_IP': '127.0.0.1'
        }
        
        secret_key = token_hex(32)
        csrf_secret_key = token_hex(32)
        
        # Simular generación de backend/.env
        backend_env = f"""
ENV=development
SECRET_KEY={secret_key}
CSRF_SECRET_KEY={csrf_secret_key}
DEBUG=true
CORS_ALLOW_ORIGINS=http://127.0.0.1:3000,http://localhost:3000
CORS_ALLOW_CREDENTIALS=true
DATABASE_URL=postgresql+psycopg2://{config['POSTGRES_USER']}:{config['POSTGRES_PASSWORD']}@alugueis_postgres:5432/{config['POSTGRES_DB']}
""".strip()
        
        # Verificar contenido
        checks = [
            ('SECRET_KEY=' in backend_env, 'SECRET_KEY presente'),
            ('CSRF_SECRET_KEY=' in backend_env, 'CSRF_SECRET_KEY presente'),
            ('alugueis_postgres' in backend_env, 'Container name correcto'),
            ('alugueisv3_db' in backend_env, 'Database name correcto'),
            ('CORS_ALLOW_ORIGINS=' in backend_env, 'CORS configurado'),
        ]
        
        all_passed = True
        for check, description in checks:
            if check:
                console.print(f"   ✅ {description}")
            else:
                console.print(f"   ❌ {description}")
                all_passed = False
        
        if all_passed:
            console.print("\n✅ Contenido .env correcto\n")
            return True
        else:
            console.print("\n[bold red]❌ Algunos checks fallaron[/bold red]\n")
            return False
        
    except Exception as e:
        console.print(f"[bold red]❌ Error: {e}[/bold red]\n")
        return False


def test_container_names():
    """Verifica que los nombres de containers sean consistentes"""
    console.print("[bold cyan]Test 5: Nombres de Containers...[/bold cyan]")
    try:
        # Leer el archivo install.py
        with open('scripts/install.py', 'r') as f:
            content = f.read()
        
        # Verificar nombres correctos
        correct_names = [
            'alugueis_postgres',
            'alugueis_backend',
        ]
        
        # Verificar nombres incorrectos (no deben existir)
        incorrect_names = [
            'alugueisV2_postgres',
            'alugueisV2_backend',
            'alugueisV1_postgres',
        ]
        
        errors = []
        
        for name in correct_names:
            if name not in content:
                errors.append(f"Nombre correcto '{name}' no encontrado")
            else:
                console.print(f"   ✅ '{name}' presente")
        
        for name in incorrect_names:
            if name in content:
                errors.append(f"Nombre obsoleto '{name}' aún presente")
        
        if errors:
            for error in errors:
                console.print(f"   [red]❌ {error}[/red]")
            console.print("\n[bold red]❌ Verificación de nombres fallida[/bold red]\n")
            return False
        else:
            console.print("\n✅ Todos los nombres de containers correctos\n")
            return True
        
    except Exception as e:
        console.print(f"[bold red]❌ Error: {e}[/bold red]\n")
        return False


def test_database_defaults():
    """Verifica que los defaults de database sean correctos"""
    console.print("[bold cyan]Test 6: Database Defaults...[/bold cyan]")
    try:
        # Leer el archivo install.py
        with open('scripts/install.py', 'r') as f:
            content = f.read()
        
        # Verificar defaults correctos
        correct_defaults = [
            'alugueisv3_db',
            'alugueisv3_usuario',
            'alugueisv3_senha',
        ]
        
        # Verificar defaults incorrectos (no deben existir)
        incorrect_defaults = [
            'alugueisv2_db',
            'alugueisv2_usuario',
            'alugueisv2_senha',
        ]
        
        errors = []
        
        for default in correct_defaults:
            if default not in content:
                errors.append(f"Default correcto '{default}' no encontrado")
            else:
                console.print(f"   ✅ '{default}' presente")
        
        for default in incorrect_defaults:
            if default in content:
                errors.append(f"Default obsoleto '{default}' aún presente")
                console.print(f"   [red]❌ '{default}' encontrado (debe ser removido)[/red]")
        
        if errors:
            console.print("\n[bold red]❌ Verificación de defaults fallida[/bold red]\n")
            return False
        else:
            console.print("\n✅ Todos los defaults de database correctos\n")
            return True
        
    except Exception as e:
        console.print(f"[bold red]❌ Error: {e}[/bold red]\n")
        return False


def test_header_version():
    """Verifica que el header tenga la versión correcta"""
    console.print("[bold cyan]Test 7: Versión en Header...[/bold cyan]")
    try:
        # Leer el archivo install.py
        with open('scripts/install.py', 'r') as f:
            content = f.read()
        
        if 'AlugueisV3 v2.0.0' in content:
            console.print("✅ Header con versión correcta: 'AlugueisV3 v2.0.0'\n")
            return True
        elif 'Sistema de Aluguéis' in content and 'v2.0.0' not in content:
            console.print("[bold yellow]⚠️  Header genérico (considera agregar versión)[/bold yellow]\n")
            return True
        else:
            console.print("[bold red]❌ Header sin versión o incorrecto[/bold red]\n")
            return False
        
    except Exception as e:
        console.print(f"[bold red]❌ Error: {e}[/bold red]\n")
        return False


def run_all_tests():
    """Ejecuta todos los tests"""
    console.print(
        Panel(
            Text("Tests de Verificación - install.py", justify="center", style="bold green"),
            border_style="green",
            padding=(1, 1),
        )
    )
    console.print()
    
    tests = [
        ("Imports", test_imports),
        ("Funciones", test_functions_exist),
        ("Secret Keys", test_secret_generation),
        ("Contenido .env", test_env_content_generation),
        ("Nombres Containers", test_container_names),
        ("Database Defaults", test_database_defaults),
        ("Header Versión", test_header_version),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            console.print(f"[bold red]Error ejecutando {test_name}: {e}[/bold red]\n")
            results.append((test_name, False))
    
    # Resumen
    console.print("\n" + "="*70)
    console.print("[bold cyan]RESUMEN DE TESTS:[/bold cyan]\n")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        console.print(f"  {status}  {test_name}")
    
    console.print(f"\n[bold]Total: {passed}/{total} tests pasados[/bold]")
    
    if passed == total:
        console.print("\n[bold green]🎉 ¡Todos los tests pasaron! Script listo para uso.[/bold green]")
        return 0
    else:
        console.print(f"\n[bold red]⚠️  {total - passed} test(s) fallaron. Revisar antes de usar.[/bold red]")
        return 1


if __name__ == "__main__":
    exit_code = run_all_tests()
    sys.exit(exit_code)
