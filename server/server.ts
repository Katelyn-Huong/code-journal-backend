/* eslint-disable @typescript-eslint/no-unused-vars -- Remove me */
import 'dotenv/config';
import pg, { Client } from 'pg';
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
    if (!entry) throw new ClientError(404, `Entry ${entryId} not found.`);
    res.json(entry);
  } catch (err) {
    next(err);
  }
});

app.post('/api/entries', async (req, res, next) => {
  try {
    const { title, photoUrl, notes } = req.body;
    if (!title || !photoUrl || !notes) {
      throw new ClientError(400, 'title, photoURL, or notes is required');
    }

    const sql = `
      insert into "entries" ("title", "photoUrl", "notes")
        values ($1, $2, $3)
        returning *;
    `;
    const params = [title, photoUrl, notes];
    const result = await db.query<Entry>(sql, params);
    const [entry] = result.rows;
    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
});

app.put('/api/entries/:entryId', async (req, res, next) => {
  try {
    const { entryId } = req.params;
    if (!Number.isInteger(+entryId))
      throw new ClientError(400, `entryId ${entryId} must be a number`);
    const { title, photoUrl, notes } = req.body;
    if (!title || !photoUrl || !notes)
      throw new ClientError(400, 'title, photo, and notes are required.');

    const sql = `
      update "entries"
        set "title" = $1,
            "photoUrl" = $2,
            "notes" = $3
        where "entryId" = $4
        returning *;
    `;

    const params = [title, photoUrl, notes, entryId];
    const result = await db.query<Entry>(sql, params);
    const [entry] = result.rows;
    if (!entry) throw new ClientError(404, 'Failed to update entry.');
    res.status(200).json(entry);
  } catch (err) {
    next(err);
  }
});

app.use(errorMiddleware);

app.listen(process.env.PORT, () => {
  console.log(`express server listening on port ${process.env.PORT}`);
});
