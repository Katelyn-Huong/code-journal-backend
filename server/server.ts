/* eslint-disable @typescript-eslint/no-unused-vars -- Remove me */
import 'dotenv/config';
import pg from 'pg';
import express from 'express';
import { ClientError, errorMiddleware } from './lib/index.js';

export type Entry = {
  entryId?: number;
  title: string;
  notes: string;
  photoUrl: string;
};

const db = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const app = express();
app.use(express.json());

app.get('/api/entries', async (req, res, next) => {
  try {
    const sql = `
    select * from "entries";`;

    const result = await db.query<Entry>(sql);
    const entries = result.rows;
    res.json(entries);
  } catch (err) {
    next(err);
  }
});

app.get('/api/entries/:entryId', async (req, res, next) => {
  try {
    const { entryId } = req.params;
    if (!Number.isInteger(+entryId)) {
      throw new ClientError(400, 'entryId must be an integer');
    }
    const sql = `
    select "entryId", "title", "notes", "photoUrl"
    from "entries"
    where "entryId" = $1;
    `;
    const params = [entryId];

    const result = await db.query<Entry>(sql, params);
    const [entry] = result.rows;
    if (!entry) throw new ClientError(404, 'invalid entryId');
    res.json(entry);
  } catch (err) {
    next(err);
  }
});

app.use(errorMiddleware);

app.listen(process.env.PORT, () => {
  console.log(`express server listening on port ${process.env.PORT}`);
});
