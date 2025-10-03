#!/usr/bin/env python3
"""
Script para remover todos os console.log dos arquivos JavaScript
"""
import os
import re
from pathlib import Path

def remove_console_logs(file_path):
    """Remove todas as linhas com console.log de um arquivo"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # Padrão para remover console.log completos (incluindo multi-linha)
    # Remove linhas que contenham apenas console.log
    lines = content.split('\n')
    new_lines = []
    skip_until_semicolon = False
    
    for line in lines:
        stripped = line.strip()
        
        # Se estamos pulando linhas até encontrar ponto e vírgula
        if skip_until_semicolon:
            if ';' in line:
                skip_until_semicolon = False
            continue
        
        # Verifica se a linha contém console.log
        if 'console.log(' in stripped:
            # Se não termina com ; ou ), pode ser multi-linha
            if not (stripped.endswith(';') or stripped.endswith(');')):
                skip_until_semicolon = True
            continue
        
        # Verifica se a linha contém console.warn
        if 'console.warn(' in stripped:
            if not (stripped.endswith(';') or stripped.endswith(');')):
                skip_until_semicolon = True
            continue
            
        new_lines.append(line)
    
    content = '\n'.join(new_lines)
    
    # Remover linhas vazias consecutivas (máximo 2)
    content = re.sub(r'\n\n\n+', '\n\n', content)
    
    # Só escrever se houve mudanças
    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    frontend_dir = Path('frontend/js')
    
    if not frontend_dir.exists():
        print(f"❌ Diretório {frontend_dir} não encontrado!")
        return
    
    # Encontrar todos os arquivos .js
    js_files = list(frontend_dir.rglob('*.js'))
    
    print(f"🔍 Encontrados {len(js_files)} arquivos JavaScript")
    print()
    
    modified_count = 0
    for js_file in js_files:
        if remove_console_logs(js_file):
            print(f"✅ Limpo: {js_file}")
            modified_count += 1
        else:
            print(f"⏭️  Sem alterações: {js_file}")
    
    print()
    print(f"🎉 Concluído! {modified_count} arquivos modificados de {len(js_files)} totais")

if __name__ == '__main__':
    main()
