import * as sql from 'mssql';
import * as fs from 'fs';
import * as path from 'path';

// Cargar variables de entorno desde .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

const config = {
  server: process.env.DB_SERVER || 'localhost',
  port: Number(process.env.DB_PORT) || 1433,
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'SistemaComercial',
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

interface TableInfo {
  name: string;
  columnCount: number;
  recordCount: number;
  columns: ColumnInfo[];
}

interface ColumnInfo {
  name: string;
  type: string;
  maxLength: number | null;
  isNullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  foreignKeyInfo?: string;
}

interface ForeignKey {
  tableName: string;
  columnName: string;
  referencedTable: string;
  referencedColumn: string;
}

async function generateDbDoc() {
  try {
    console.log('🔄 Generando documentación de base de datos...');

    const pool = new sql.ConnectionPool(config);
    await pool.connect();

    // Obtener todas las tablas
    const tablesQuery = `
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `;
    const tablesResult = await pool.request().query(tablesQuery);
    const tableNames = tablesResult.recordset.map(r => r.TABLE_NAME);

    // Obtener información de columnas para cada tabla
    const columnsQuery = `
      SELECT
        TABLE_NAME,
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE,
        COLUMNPROPERTY(OBJECT_ID(TABLE_SCHEMA + '.' + TABLE_NAME), COLUMN_NAME, 'IsIdentity') as IsIdentity
      FROM INFORMATION_SCHEMA.COLUMNS
      ORDER BY TABLE_NAME, ORDINAL_POSITION
    `;
    const columnsResult = await pool.request().query(columnsQuery);

    // Obtener información de Primary Keys
    const pkQuery = `
      SELECT
        OBJECT_NAME(c.object_id) AS TableName,
        COL_NAME(c.object_id, c.column_id) AS ColumnName
      FROM sys.index_columns ic
      INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
      INNER JOIN sys.indexes i ON ic.object_id = i.object_id AND ic.index_id = i.index_id
      WHERE i.is_primary_key = 1
    `;
    const pkResult = await pool.request().query(pkQuery);
    const primaryKeys = new Set(
      pkResult.recordset.map(r => `${r.TableName}.${r.ColumnName}`)
    );

    // Obtener información de Foreign Keys
    const fkQuery = `
      SELECT
        OBJECT_NAME(fk.parent_object_id) AS TableName,
        COL_NAME(fk.parent_object_id, fkc.parent_column_id) AS ColumnName,
        OBJECT_NAME(fk.referenced_object_id) AS ReferencedTable,
        COL_NAME(fk.referenced_object_id, fkc.referenced_column_id) AS ReferencedColumn
      FROM sys.foreign_keys fk
      INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
      ORDER BY TableName
    `;
    const fkResult = await pool.request().query(fkQuery);
    const foreignKeys: ForeignKey[] = fkResult.recordset.map((fk: any) => ({
      tableName: fk.TableName,
      columnName: fk.ColumnName,
      referencedTable: fk.ReferencedTable,
      referencedColumn: fk.ReferencedColumn,
    }));

    // Obtener recuento de registros para cada tabla
    const tableInfos: TableInfo[] = [];

    for (const tableName of tableNames) {
      try {
        const countQuery = `SELECT COUNT(*) as cnt FROM [${tableName}]`;
        const countResult = await pool.request().query(countQuery);
        const recordCount = countResult.recordset[0].cnt;

        const tableColumns = columnsResult.recordset.filter(
          (c: any) => c.TABLE_NAME === tableName
        );

        const columns: ColumnInfo[] = tableColumns.map((col: any) => {
          const isPrimaryKey = primaryKeys.has(`${tableName}.${col.COLUMN_NAME}`);
          const fk = foreignKeys.find(
            f => f.tableName === tableName && f.columnName === col.COLUMN_NAME
          );

          return {
            name: col.COLUMN_NAME,
            type: col.DATA_TYPE,
            maxLength: col.CHARACTER_MAXIMUM_LENGTH,
            isNullable: col.IS_NULLABLE === 'YES',
            isPrimaryKey,
            isForeignKey: !!fk,
            foreignKeyInfo: fk ? `${fk.referencedTable}.${fk.referencedColumn}` : undefined,
          };
        });

        tableInfos.push({
          name: tableName,
          columnCount: columns.length,
          recordCount,
          columns,
        });
      } catch (error) {
        console.warn(`⚠️ Error al procesar tabla ${tableName}`);
      }
    }

    // Generar documentación markdown
    let markdown = '# 📊 Documentación de Base de Datos\n\n';
    markdown += `**Base de datos:** ${config.database}\n`;
    markdown += `**Servidor:** ${config.server}\n`;
    markdown += `**Última actualización:** ${new Date().toLocaleString('es-ES')}\n`;
    markdown += `**Generado automáticamente:** Este archivo se regenera cada vez que ejecutas el proyecto\n\n`;
    markdown += '---\n\n';

    // Resumen
    markdown += '## 📋 Resumen\n\n';
    markdown += `- **Total de tablas:** ${tableInfos.length}\n`;
    markdown += `- **Total de relaciones (FKs):** ${foreignKeys.length}\n\n`;

    // Índice
    markdown += '## 📑 Índice de Tablas\n\n';
    tableInfos.forEach(table => {
      markdown += `- [${table.name}](#${table.name}) (${table.columnCount} columnas, ${table.recordCount} registros)\n`;
    });
    markdown += '\n---\n\n';

    // Relaciones
    markdown += '## 🔗 Relaciones Entre Tablas\n\n';
    markdown += '```\n';
    const processedRelations = new Set<string>();
    foreignKeys.forEach(fk => {
      const relationKey = `${fk.tableName}-${fk.referencedTable}`;
      if (!processedRelations.has(relationKey)) {
        markdown += `${fk.referencedTable} (1) ──> (N) ${fk.tableName}\n`;
        markdown += `  └─ ${fk.referencedColumn} -> ${fk.columnName}\n\n`;
        processedRelations.add(relationKey);
      }
    });
    markdown += '```\n\n---\n\n';

    // Detalles de cada tabla
    markdown += '## 📋 Detalles de Tablas\n\n';
    for (const table of tableInfos) {
      markdown += `### ${table.name}\n`;
      markdown += `**Registros:** ${table.recordCount}\n\n`;
      markdown += '#### Estructura\n\n';
      markdown += '| Columna | Tipo | Máx. Long. | Nulable | PK | FK |\n';
      markdown += '|---------|------|-----------|---------|----|---------|\n';

      table.columns.forEach(col => {
        const maxLen = col.maxLength ? col.maxLength : '-';
        const nullable = col.isNullable ? 'Sí' : 'No';
        const isPk = col.isPrimaryKey ? '✓' : '';
        const isFk = col.isForeignKey ? `→ ${col.foreignKeyInfo}` : '';
        markdown += `| ${col.name} | ${col.type} | ${maxLen} | ${nullable} | ${isPk} | ${isFk} |\n`;
      });

      // Obtener datos de la tabla
      markdown += '\n#### Datos\n\n';
      try {
        const dataQuery = `SELECT TOP 100 * FROM [${table.name}]`;
        const dataResult = await pool.request().query(dataQuery);
        const rows = dataResult.recordset;

        if (rows.length === 0) {
          markdown += '_No hay registros_\n\n';
        } else {
          const columnNames = Object.keys(rows[0]);
          markdown += '| ' + columnNames.join(' | ') + ' |\n';
          markdown += '|' + columnNames.map(() => '------').join('|') + '|\n';

          rows.forEach(row => {
            const values = columnNames.map(col => {
              const value = row[col];
              if (value === null) return '_NULL_';
              if (typeof value === 'string' && value.length > 100) {
                return value.substring(0, 97) + '...';
              }
              return String(value).replace(/\|/g, '\\|');
            });
            markdown += '| ' + values.join(' | ') + ' |\n';
          });

          markdown += '\n';
        }
      } catch (error) {
        markdown += `_Error al obtener datos: ${error instanceof Error ? error.message : 'Error desconocido'}_\n\n`;
      }
    }

    const outputPath = path.join(process.cwd(), 'DATABASE.md');
    fs.writeFileSync(outputPath, markdown);

    console.log(`✅ Documentación generada en ${outputPath}`);

    await pool.close();
  } catch (error) {
    console.warn('⚠️ Error generando documentación de BD (continuando):', error instanceof Error ? error.message : error);
    console.log('ℹ️ El servidor de desarrollo continuará sin documentación de BD');
  }
}

generateDbDoc();
