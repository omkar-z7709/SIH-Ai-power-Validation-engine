import { NextResponse } from 'next/server'; import { requireRole } from '@/lib/auth/middleware'; import { ApplicationRepository } from '@/lib/db/repository'; export const GET = requireRole(['REVIEW_OFFICER','SENIOR_OFFICER','SYSTEM_ADMIN'])(async (req:any,ctx:any)=>{try{const apps=await ApplicationRepository.getAll();    const counts = {
      total: apps.length,
      needsReview: apps.filter((a: any) => a.status === 'NEEDS_REVIEW').length,
      pending: apps.filter((a: any) => (a.status === 'INCOMPLETE' || a.status === 'AWAITING_HUMAN_REVIEW')).length,
      approved: apps.filter((a: any) => a.status === 'APPROVED_BY_REVIEWER').length,
      rejected: apps.filter((a: any) => a.status === 'REJECTED_BY_REVIEWER').length,
      storageMode: ApplicationRepository.getStorageMode(),
    };
    return NextResponse.json({ success: true, data: counts });}catch(e:any){return NextResponse.json({success:false,error:e.message},{status:500});}});