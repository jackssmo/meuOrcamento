import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { getMysqlOptions } from '../config/mysqlOptions';

dotenv.config();

async function run(): Promise<void> {
  const connection = await mysql.createConnection(getMysqlOptions());

  try {
    console.log('--- Buscando despesas até 09/2026 (<= 2026-09-30) ---');

    const [rows] = await connection.execute<mysql.RowDataPacket[]>(
      `SELECT id, user_id, description, amount, card, date, is_paid 
       FROM transactions 
       WHERE type = 'expense' AND date <= '2026-09-30'
       ORDER BY date DESC`
    );

    console.log(`Total de despesas encontradas até 09/2026: ${rows.length}`);

    const unpaidCount = rows.filter((r) => !r.is_paid).length;
    console.log(`Despesas que ainda estão pendentes (não pagas): ${unpaidCount}`);

    if (rows.length > 0) {
      console.log('Exemplos de despesas que serão marcadas como pagas:');
      rows.slice(0, 5).forEach((r) => {
        console.log(`  - [ID ${r.id}] ${r.date?.toISOString ? r.date.toISOString().substring(0, 10) : r.date} | ${r.description} | R$ ${r.amount} | Cartão: ${r.card || 'Nenhum'} | Status atual: ${r.is_paid ? 'Paga' : 'Pendente'}`);
      });

      const [updateResult] = await connection.execute<mysql.ResultSetHeader>(
        `UPDATE transactions 
         SET is_paid = TRUE 
         WHERE type = 'expense' AND date <= '2026-09-30' AND (is_paid = FALSE OR is_paid IS NULL)`
      );

      console.log(`\nSucesso! ${updateResult.affectedRows} despesas foram atualizadas para PAGA.`);
    } else {
      console.log('Nenhuma despesa encontrada até 09/2026.');
    }
  } finally {
    await connection.end();
  }
}

run().catch((error) => {
  console.error('Erro ao marcar despesas como pagas:', error);
  process.exitCode = 1;
});

