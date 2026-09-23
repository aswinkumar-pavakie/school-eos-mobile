// Faculty Campus tiles -- real backend calls only (school-eos-backend's
// campus.controller.ts). Every request here is scoped to "my own requests"
// server-side (requested_by = the caller), so no client-side filtering is
// needed on the list responses.

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}

export interface House {
  id: string;
  name: string;
  colourHex: string | null;
  status: string;
}

export async function listHouses(): Promise<House[]> {
  const res = await authedRequest<ApiEnvelope<House[]>>('/campus/houses');
  return res.data;
}

export interface FoodOrder {
  id: string;
  items: string;
  pickupTime: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
}

export async function listFoodOrders(): Promise<FoodOrder[]> {
  const res = await authedRequest<ApiEnvelope<FoodOrder[]>>('/campus/food-orders');
  return res.data;
}

export async function createFoodOrder(input: { items: string; pickupTime?: string; notes?: string }): Promise<FoodOrder> {
  const res = await authedRequest<ApiEnvelope<FoodOrder>>('/campus/food-orders', { method: 'POST', body: input });
  return res.data;
}

export interface MedicalAppointment {
  id: string;
  preferredDate: string;
  preferredTime: string | null;
  reason: string;
  status: string;
  createdAt: string;
}

export async function listMedicalAppointments(): Promise<MedicalAppointment[]> {
  const res = await authedRequest<ApiEnvelope<MedicalAppointment[]>>('/campus/medical-appointments');
  return res.data;
}

export async function createMedicalAppointment(input: { preferredDate: string; preferredTime?: string; reason: string }): Promise<MedicalAppointment> {
  const res = await authedRequest<ApiEnvelope<MedicalAppointment>>('/campus/medical-appointments', { method: 'POST', body: input });
  return res.data;
}

export interface CopyCenterOrder {
  id: string;
  description: string;
  quantity: number | null;
  neededBy: string | null;
  status: string;
  createdAt: string;
}

export async function listCopyCenterOrders(): Promise<CopyCenterOrder[]> {
  const res = await authedRequest<ApiEnvelope<CopyCenterOrder[]>>('/campus/copy-center-orders');
  return res.data;
}

export async function createCopyCenterOrder(input: { description: string; quantity?: number; neededBy?: string }): Promise<CopyCenterOrder> {
  const res = await authedRequest<ApiEnvelope<CopyCenterOrder>>('/campus/copy-center-orders', { method: 'POST', body: input });
  return res.data;
}

export interface StationeryOrder {
  id: string;
  items: string;
  notes: string | null;
  status: string;
  createdAt: string;
}

export async function listStationeryOrders(): Promise<StationeryOrder[]> {
  const res = await authedRequest<ApiEnvelope<StationeryOrder[]>>('/campus/stationery-orders');
  return res.data;
}

export async function createStationeryOrder(input: { items: string; notes?: string }): Promise<StationeryOrder> {
  const res = await authedRequest<ApiEnvelope<StationeryOrder>>('/campus/stationery-orders', { method: 'POST', body: input });
  return res.data;
}

export type FeedbackCategory = 'FACILITIES' | 'FOOD' | 'TRANSPORT' | 'SAFETY' | 'OTHER';

export interface Feedback {
  id: string;
  category: FeedbackCategory;
  message: string;
  createdAt: string;
}

export async function listFeedback(): Promise<Feedback[]> {
  const res = await authedRequest<ApiEnvelope<Feedback[]>>('/campus/feedback');
  return res.data;
}

export async function createFeedback(input: { category: FeedbackCategory; message: string }): Promise<Feedback> {
  const res = await authedRequest<ApiEnvelope<Feedback>>('/campus/feedback', { method: 'POST', body: input });
  return res.data;
}
