import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { getMysqlOptions } from './mysqlOptions';

dotenv.config(); 

 const pool = mysql.createPool({
      ...getMysqlOptions(),
      waitForConnections: true,
      connectionLimit: 10,
      maxIdle: 10,
      idleTimeout: 60000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      queueLimit: 0,
    });

pool.getConnection().then((connection) => {
  console.log('Conexão com o MySQL estabelecida com sucesso!');
  connection.release();
}).catch((error) => {
  console.error('Erro ao conectar ao MySQL:', error);
});

export default pool;