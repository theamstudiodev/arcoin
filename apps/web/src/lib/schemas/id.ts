import {z} from 'zod';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A row id, as Postgres stores it.
 *
 * Deliberately not `z.uuid()`. That enforces RFC 4122's version and variant bits, while Postgres'
 * `uuid` type accepts any 32 hex digits — so a perfectly real id can fail it. The studio's own seed
 * numbers projects `…-c000-…` and packages `…-d000-…`, both of which RFC 4122 calls reserved
 * variants, and `z.uuid()` rejects them: editing a project came back "That project could not be
 * found." An id reaches us from the database, never typed by a person, so the job here is to catch a
 * malformed one, not to police which generator made it.
 */
export const idSchema = (error: string) => z.string({error}).regex(UUID, {error});
