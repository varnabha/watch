import type {Request,Response,NextFunction} from 'express'; import bcrypt from 'bcryptjs'; import jwt from 'jsonwebtoken'; import {parse} from 'cookie'; import type {Config} from './config.js';
export type User={email:string;name:string}; const COOKIE='watchparty_session';
export function users(c:Config){return [{email:c.USER1_EMAIL.toLowerCase(),name:c.USER1_NAME,hash:c.USER1_PASSWORD_HASH},{email:c.USER2_EMAIL.toLowerCase(),name:c.USER2_NAME,hash:c.USER2_PASSWORD_HASH}];}
export async function authenticate(c:Config,email:string,password:string):Promise<User|null>{const candidate=users(c).find(u=>u.email===email.toLowerCase()); const hash=candidate?.hash ?? c.USER1_PASSWORD_HASH; const valid=await bcrypt.compare(password,hash); return candidate&&valid?{email:candidate.email,name:candidate.name}:null;}
export function sign(c:Config,user:User){return jwt.sign(user,c.SESSION_SECRET,{expiresIn:'7d'});}
export function read(c:Config,cookie?:string):User|null{try {const token=parse(cookie??'')[COOKIE]; if(!token)return null; const p=jwt.verify(token,c.SESSION_SECRET); return typeof p==='object'&&typeof p.email==='string'&&typeof p.name==='string'?{email:p.email,name:p.name}:null;}catch{return null;}}
export function requireAuth(c:Config){return (req:Request,res:Response,next:NextFunction)=>{const user=read(c,req.headers.cookie); if(!user)return res.status(401).json({error:'authentication required'}); (req as Request&{user:User}).user=user;next();};}
export function csrf(req:Request,res:Response,next:NextFunction){if(req.header('x-requested-with')!=='WatchParty')return res.status(403).json({error:'missing CSRF header'});next();}
export const cookieOptions={httpOnly:true,secure:true,sameSite:'strict' as const,path:'/',maxAge:7*24*60*60*1000}; export {COOKIE};
