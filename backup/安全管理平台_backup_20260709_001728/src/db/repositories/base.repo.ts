import type { Table } from 'dexie'
import { db, generateId, now } from '@/db'
import type { BaseEntity } from '@/types'

export class BaseRepository<T extends BaseEntity> {
  table: Table<T, string>

  constructor(table: Table<T, string>) {
    this.table = table
  }

  async getById(id: string): Promise<T | undefined> {
    return this.table.get(id)
  }

  async getAll(): Promise<T[]> {
    try {
      return await this.table.orderBy('createdAt').reverse().toArray()
    } catch {
      const all = await this.table.toArray()
      return all.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
    }
  }

  async find(filter: Partial<T>): Promise<T[]> {
    const keys = Object.keys(filter) as (keyof T)[]
    if (keys.length === 0) return this.getAll()

    const all = await this.table.toArray()
    return all
      .filter((item) => {
        return keys.every((k) => item[k] === filter[k])
      })
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
  }

  async count(): Promise<number> {
    return this.table.count()
  }

  async add(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = generateId()
    const timestamp = now()
    const record = {
      ...entity,
      id,
      createdAt: timestamp,
      updatedAt: timestamp,
    } as unknown as T
    await this.table.add(record)
    return id
  }

  async addWithId(entity: T): Promise<string> {
    const timestamp = now()
    const record = {
      ...entity,
      createdAt: entity.createdAt ?? timestamp,
      updatedAt: timestamp,
    }
    if (!record.id) {
      record.id = generateId()
    }
    await this.table.put(record as T)
    return record.id!
  }

  async update(id: string, changes: Partial<T>): Promise<void> {
    const updateData: Record<string, unknown> = {
      ...(changes as Record<string, unknown>),
      updatedAt: now(),
    }
    await this.table.update(id, updateData as never)
  }

  async remove(id: string): Promise<void> {
    await this.table.delete(id)
  }

  async removeBulk(ids: string[]): Promise<void> {
    await this.table.bulkDelete(ids)
  }

  async clear(): Promise<void> {
    await this.table.clear()
  }
}

export { db, generateId, now }
