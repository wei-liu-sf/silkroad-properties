import dbf
import csv
import os

dbf_file_path = os.path.expanduser('~/Downloads/L3_SHP_M026_Belmont/M026Assess_CY24_FY24.dbf')
csv_file_path = os.path.join(os.path.dirname(__file__), 'backend', 'belmont-properties.csv')

try:
    table = dbf.Table(dbf_file_path, codepage='utf8')
    table.open(dbf.READ_ONLY)

    with open(csv_file_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(table.field_names)
        for record in table:
            writer.writerow(list(record))

    print(f"Successfully converted {dbf_file_path} to {csv_file_path}")

except Exception as e:
    print(f"An error occurred: {e}")

finally:
    if 'table' in locals():
        table.close() 