import pandas as pd
import json
import os

file_path = r'c:\Users\xpalves1997\OneDrive\05_projetos_free\04_projeto_geise\material\BANCO_COPY.xlsx'
xls = pd.ExcelFile(file_path)

# 1. Parse Análise Temporal
df_temp = pd.read_excel(xls, 'ANÁLISE TEMPORAL')
df_temp_clean = df_temp[['ANO', 'COQUELUCHE', 'TAXA', 'POPULACAO']].dropna(subset=['ANO'])
# Convert columns to proper types
df_temp_clean['ANO'] = df_temp_clean['ANO'].astype(int)
df_temp_clean['COQUELUCHE'] = df_temp_clean['COQUELUCHE'].astype(int)
df_temp_clean['TAXA'] = df_temp_clean['TAXA'].astype(float)
df_temp_clean['POPULACAO'] = df_temp_clean['POPULACAO'].astype(int)

temporal_data = df_temp_clean.to_dict(orient='records')

# 2. Parse Sociodemográfico
df_socio = pd.read_excel(xls, 'SOCIODEMOGRAFICO')

# Helper function to clean cell values (e.g. convert '-' to 0, parse to int)
def clean_val(x):
    if pd.isna(x) or str(x).strip() in ['-', '']:
        return 0
    try:
        return int(float(x))
    except ValueError:
        return str(x).strip()

def parse_sub_table(df, start_row, num_rows):
    # Extract the rows
    sub_df = df.iloc[start_row : start_row + num_rows].copy()
    
    # Drop columns that are completely empty
    sub_df = sub_df.dropna(how='all', axis=1)
    
    # Get columns (headers are in the first row of start_row, or let's clean them)
    # The structure: row 0 is header, rows 1-4 are SP, RJ, ES, MG, row 5 is Total
    header = [str(col).strip() for col in sub_df.iloc[0].tolist()]
    
    table_dict = {}
    for r_idx in range(1, num_rows):
        row_vals = sub_df.iloc[r_idx].tolist()
        state_name = str(row_vals[0]).strip()
        
        # Parse all categories
        state_data = {}
        for c_idx in range(1, len(header)):
            cat_name = header[c_idx]
            val = clean_val(row_vals[c_idx])
            state_data[cat_name] = val
            
        table_dict[state_name] = state_data
        
    return table_dict

# Locate sub-tables based on row index in df_socio:
# Row 0 to 5: Gênero
# Row 7 to 12: Raça/Cor
# Row 14 to 19: Faixa Etária
# Row 21 to 26: Zona de Residência
# Row 28 to 33: Escolaridade
# Row 35 to 40: Critério Diagnóstico
# Row 42 to 47: Evolução

sociodem_data = {
    "sexo": parse_sub_table(df_socio, 0, 6),
    "raca": parse_sub_table(df_socio, 7, 6),
    "faixa_etaria": parse_sub_table(df_socio, 14, 6),
    "zona": parse_sub_table(df_socio, 21, 6),
    "escolaridade": parse_sub_table(df_socio, 28, 6),
    "criterio_diagnostico": parse_sub_table(df_socio, 35, 6),
    "evolucao": parse_sub_table(df_socio, 42, 6)
}

# 3. Create the data.js file
data_js_content = f"""// Banco de dados dinâmico gerado a partir do Excel
const COQUELUCHE_DATA = {json.dumps({
    "temporal": temporal_data,
    "sociodemografico": sociodem_data
}, indent=2, ensure_ascii=False)};
"""

# Ensure js folder exists
os.makedirs(r'c:\Users\xpalves1997\OneDrive\05_projetos_free\04_projeto_geise\js', exist_ok=True)
output_js_path = r'c:\Users\xpalves1997\OneDrive\05_projetos_free\04_projeto_geise\js\data.js'

with open(output_js_path, 'w', encoding='utf-8') as f:
    f.write(data_js_content)

print(f"data.js written successfully to: {output_js_path}!")
