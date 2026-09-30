import { mkdirSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
import { operationSchema, pushSchema, verifySchema, recordSchema } from '../packages/contracts';
const json = (schema: z.ZodType) => z.toJSONSchema(schema, {target: 'draft-2020-12'});
const ref = (name: string) => ({$ref: `#/components/schemas/${name}`});
const response = (schema: object) => ({description: 'Success', content: {'application/json': {schema}}});
const secured = [{bearer: []}];
const post = (schema: object, output: object, security = secured) => ({security, requestBody: {required:true, content:{'application/json':{schema}}}, responses:{'201':response(output),'400':response(ref('Error')),'401':response(ref('Error')),'429':response(ref('Error')),'503':response(ref('Error'))}});
const document = {
  openapi: '3.1.0', info: {title: 'AcrePilot P0 development API', version:'0.0.1', description:'Fixture authentication proves the flow only. It does not verify external email/phone ownership.'},
  paths: {
    '/v1/health': {get:{responses:{'200':response({type:'object',properties:{status:{type:'string'},scope:{type:'string'}}})}}},
    '/v1/auth/codes': {post:post({type:'object',additionalProperties:false,required:['identity'],properties:{identity:{type:'string',maxLength:254,description:'Email or E.164 Kenyan +2541/+2547 phone'}}}, {type:'object',properties:{challengeId:{type:'string',format:'uuid'},developmentCode:{type:'string'},verificationKind:{const:'development_fixture'}}}, [])},
    '/v1/auth/verify': {post:post(ref('Verify'), {type:'object',properties:{ownerId:{type:'string',format:'uuid'},token:{type:'string'},verificationKind:{const:'development_fixture'}}}, [])},
    '/v1/sessions/revoke': {post:post({type:'object'}, {type:'object',properties:{revoked:{type:'boolean'}}})},
    '/v1/sync/push': {post:post(ref('Push'), {type:'object',properties:{acknowledgements:{type:'array',items:ref('Ack')}}})},
    '/v1/sync/pull': {get:{security:secured,parameters:[{name:'cursor',in:'query',schema:{type:'string',pattern:'^\\d{1,15}$',default:'0'}}],responses:{'200':response({type:'object',properties:{records:{type:'array',maxItems:100,items:ref('ServerRecord')},cursor:{type:'string'},hasMore:{type:'boolean'}}}),'400':response(ref('Error')),'401':response(ref('Error'))}}},
  },
  components: {securitySchemes:{bearer:{type:'http',scheme:'bearer'}},schemas:{
    Operation:json(operationSchema), Push:json(pushSchema), Verify:json(verifySchema), RecordData:json(recordSchema),
    ServerRecord:{type:'object',required:['id','version','data','deleted'],properties:{id:{type:'string',format:'uuid'},version:{type:'integer',minimum:1},data:ref('RecordData'),deleted:{type:'boolean'}}},
    Ack:{type:'object',required:['operationId','status'],properties:{operationId:{type:'string',format:'uuid'},status:{enum:['accepted','conflict','invalid']},record:ref('ServerRecord'),code:{type:'string'}}},
    Error:{type:'object',properties:{code:{type:'string'}}},
  }},
};
mkdirSync('docs', {recursive:true}); writeFileSync('docs/openapi.json', JSON.stringify(document,null,2)+'\n');
