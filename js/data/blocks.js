/* Блоки, предметы, рецепты, свойства. Статические данные без зависимостей. */
export const B = { AIR:0, GRASS:1, DIRT:2, STONE:3, SAND:4, LOG:5, LEAVES:6, WATER:7,
            PLANKS:8, COBBLE:9, GLASS:10, BRICK:11, SNOW:12, BEDROCK:13,
            CRAFT:14, COAL_ORE:15, IRON_ORE:16, FURNACE:17, DIAMOND_ORE:18, CHEST:19,
            OBSIDIAN:20, NETHERRACK:21, GLOWSTONE:22, PORTAL:23,
            END_STONE:24, END_FRAME:25, END_FRAME_EYE:26, END_PORTAL:27, LAVA:28,
            BIRCH_LOG:29, BIRCH_LEAVES:30, SPRUCE_LOG:31, SPRUCE_LEAVES:32,
            ACACIA_LOG:33, ACACIA_LEAVES:34, RED_SAND:35, TERRACOTTA:36,
            AMETHYST:37, CALCITE:38, SMOOTH_STONE:39, GRAVEL:40, CLAY:41,
            DARK_PRISMARINE:42, MOSSY_COBBLE:43, TERRACOTTA_ORANGE:44, TERRACOTTA_YELLOW:45 };
export const IT = { STICK:100,
  WOOD_PICK:101, STONE_PICK:102, IRON_PICK:103, DIAMOND_PICK:104,
  WOOD_AXE:105,  STONE_AXE:106,  IRON_AXE:107,  DIAMOND_AXE:108,
  WOOD_SWORD:109, STONE_SWORD:110, IRON_SWORD:111, DIAMOND_SWORD:112,
  COAL:113, RAW_IRON:114, IRON_INGOT:115, DIAMOND:116,
  RAW_PORK:117, COOKED_PORK:118, RAW_BEEF:119, STEAK:120,
  RAW_CHICKEN:121, COOKED_CHICKEN:122,
  BUCKET:123, BUCKET_WATER:124, APPLE:125,
  FLINT_STEEL:126, BLAZE_ROD:127, BLAZE_POWDER:128,
  ENDER_PEARL:129, ENDER_EYE:130, BUCKET_LAVA:131 };

export const BLOCKS = {
  [B.GRASS]:       {name:'Дёрн',           top:0,  side:1,  bot:2},
  [B.DIRT]:        {name:'Земля',          top:2,  side:2,  bot:2},
  [B.STONE]:       {name:'Камень',         top:3,  side:3,  bot:3},
  [B.SAND]:        {name:'Песок',          top:4,  side:4,  bot:4},
  [B.LOG]:         {name:'Дуб',            top:6,  side:5,  bot:6},
  [B.LEAVES]:      {name:'Листва дуба',    top:7,  side:7,  bot:7},
  [B.WATER]:       {name:'Вода',           top:8,  side:8,  bot:8},
  [B.PLANKS]:      {name:'Доски',          top:9,  side:9,  bot:9},
  [B.COBBLE]:      {name:'Булыжник',       top:10, side:10, bot:10},
  [B.GLASS]:       {name:'Стекло',         top:11, side:11, bot:11},
  [B.BRICK]:       {name:'Кирпич',         top:12, side:12, bot:12},
  [B.SNOW]:        {name:'Снег',           top:13, side:13, bot:13},
  [B.BEDROCK]:     {name:'Бедрок',         top:14, side:14, bot:14},
  [B.CRAFT]:       {name:'Верстак',        top:15, side:15, bot:9},
  [B.COAL_ORE]:    {name:'Угольная руда',  top:16, side:16, bot:16},
  [B.IRON_ORE]:    {name:'Железная руда',  top:17, side:17, bot:17},
  [B.FURNACE]:     {name:'Печь',           top:10, side:18, bot:10},
  [B.DIAMOND_ORE]: {name:'Алмазная руда',  top:19, side:19, bot:19},
  [B.CHEST]:       {name:'Сундук',         top:20, side:20, bot:20},
  [B.OBSIDIAN]:    {name:'Обсидиан',       top:21, side:21, bot:21},
  [B.NETHERRACK]:  {name:'Адский камень',  top:22, side:22, bot:22},
  [B.GLOWSTONE]:   {name:'Светокамень',    top:23, side:23, bot:23},
  [B.PORTAL]:      {name:'Портал',         top:24, side:24, bot:24},
  [B.END_STONE]:   {name:'Камень Энда',    top:25, side:25, bot:25},
  [B.END_FRAME]:   {name:'Рамка портала',  top:26, side:26, bot:26},
  [B.END_FRAME_EYE]:{name:'Рамка с оком',  top:27, side:27, bot:27},
  [B.END_PORTAL]:  {name:'Портал Энда',    top:28, side:28, bot:28},
  [B.LAVA]:        {name:'Лава',           top:29, side:29, bot:29},
  [B.BIRCH_LOG]:   {name:'Берёза',         top:6,  side:30, bot:6},
  [B.BIRCH_LEAVES]:{name:'Листва берёзы',  top:31, side:31, bot:31},
  [B.SPRUCE_LOG]:  {name:'Ель',            top:6,  side:32, bot:6},
  [B.SPRUCE_LEAVES]:{name:'Хвоя',          top:7,  side:7,  bot:7},
  [B.ACACIA_LOG]:  {name:'Акация',         top:6,  side:33, bot:6},
  [B.ACACIA_LEAVES]:{name:'Листва акации', top:7,  side:7,  bot:7},
  [B.RED_SAND]:    {name:'Красный песок',  top:34, side:34, bot:34},
  [B.TERRACOTTA]:  {name:'Терракота',      top:35, side:35, bot:35},
  [B.AMETHYST]:    {name:'Аметист',        top:36, side:36, bot:36},
  [B.CALCITE]:     {name:'Кальцит',        top:37, side:37, bot:37},
  [B.SMOOTH_STONE]:{name:'Гладкий камень', top:38, side:38, bot:38},
  [B.GRAVEL]:      {name:'Гравий',         top:39, side:39, bot:39},
  [B.CLAY]:        {name:'Глина',          top:40, side:40, bot:40},
  [B.DARK_PRISMARINE]:{name:'Тёмный призмарин', top:41, side:41, bot:41},
  [B.MOSSY_COBBLE]:{name:'Мшистый булыжник', top:42, side:42, bot:42},
  [B.TERRACOTTA_ORANGE]:{name:'Оранж. терракота', top:43, side:43, bot:43},
  [B.TERRACOTTA_YELLOW]:{name:'Жёлтая терракота', top:44, side:44, bot:44},
};
export const ITEMS = {
  [IT.STICK]:        {name:'Палка'},
  [IT.WOOD_PICK]:    {name:'Деревянная кирка', tool:{type:'pick', mult:2.4, dmg:2, dur:60}},
  [IT.STONE_PICK]:   {name:'Каменная кирка',   tool:{type:'pick', mult:4.0, dmg:3, dur:132}},
  [IT.IRON_PICK]:    {name:'Железная кирка',   tool:{type:'pick', mult:6.0, dmg:3, dur:251}},
  [IT.DIAMOND_PICK]: {name:'Алмазная кирка',   tool:{type:'pick', mult:8.0, dmg:4, dur:1024}},
  [IT.WOOD_AXE]:     {name:'Деревянный топор', tool:{type:'axe',  mult:2.4, dmg:3, dur:60}},
  [IT.STONE_AXE]:    {name:'Каменный топор',   tool:{type:'axe',  mult:4.0, dmg:4, dur:132}},
  [IT.IRON_AXE]:     {name:'Железный топор',   tool:{type:'axe',  mult:6.0, dmg:5, dur:251}},
  [IT.DIAMOND_AXE]:  {name:'Алмазный топор',   tool:{type:'axe',  mult:8.0, dmg:6, dur:1024}},
  [IT.WOOD_SWORD]:   {name:'Деревянный меч',   tool:{type:'sword',mult:1.0, dmg:4, dur:60}},
  [IT.STONE_SWORD]:  {name:'Каменный меч',     tool:{type:'sword',mult:1.0, dmg:5, dur:132}},
  [IT.IRON_SWORD]:   {name:'Железный меч',     tool:{type:'sword',mult:1.0, dmg:6, dur:251}},
  [IT.DIAMOND_SWORD]:{name:'Алмазный меч',     tool:{type:'sword',mult:1.0, dmg:7, dur:1024}},
  [IT.COAL]:         {name:'Уголь'},
  [IT.RAW_IRON]:     {name:'Железная руда (предмет)'},
  [IT.IRON_INGOT]:   {name:'Железный слиток'},
  [IT.DIAMOND]:      {name:'Алмаз'},
  [IT.RAW_PORK]:     {name:'Сырая свинина',  food:3},
  [IT.COOKED_PORK]:  {name:'Жаркая свинина', food:8},
  [IT.RAW_BEEF]:     {name:'Сырая говядина', food:3},
  [IT.STEAK]:        {name:'Стейк',          food:8},
  [IT.RAW_CHICKEN]:  {name:'Сырая курица',   food:2},
  [IT.COOKED_CHICKEN]:{name:'Жареная курица',food:6},
  [IT.BUCKET]:       {name:'Ведро'},
  [IT.BUCKET_WATER]: {name:'Ведро воды'},
  [IT.BUCKET_LAVA]:  {name:'Ведро лавы'},
  [IT.APPLE]:        {name:'Яблоко', food:4},
  [IT.FLINT_STEEL]:  {name:'Огниво', tool:{type:'ignite', mult:1, dmg:1, dur:64}},
  [IT.BLAZE_ROD]:    {name:'Ифритовый стержень'},
  [IT.BLAZE_POWDER]: {name:'Ифритовый порошок'},
  [IT.ENDER_PEARL]:  {name:'Жемчуг Края'},
  [IT.ENDER_EYE]:    {name:'Око Края'},
};
export function nameOf(id){ return BLOCKS[id] ? BLOCKS[id].name : (ITEMS[id] ? ITEMS[id].name : '???'); }
export function isBlockItem(id){ return id>0 && id<100 && !!BLOCKS[id] && id!==B.WATER; }
export function isTool(id){ return !!(ITEMS[id] && ITEMS[id].tool); }
export function isStackable(id){
  return !isTool(id) && id!==IT.BUCKET && id!==IT.BUCKET_WATER && id!==IT.BUCKET_LAVA;
}

export const OPAQUE = new Array(64).fill(true);
OPAQUE[B.AIR]=OPAQUE[B.LEAVES]=OPAQUE[B.WATER]=OPAQUE[B.GLASS]=false;
OPAQUE[B.PORTAL]=OPAQUE[B.LAVA]=false;
OPAQUE[B.BIRCH_LEAVES]=OPAQUE[B.SPRUCE_LEAVES]=OPAQUE[B.ACACIA_LEAVES]=false;
export const SOLID = new Array(64).fill(true);
SOLID[B.AIR]=SOLID[B.WATER]=SOLID[B.LAVA]=false;
SOLID[B.PORTAL]=SOLID[B.END_PORTAL]=false;
export const AOS = OPAQUE.slice();
AOS[B.LEAVES]=AOS[B.BIRCH_LEAVES]=AOS[B.SPRUCE_LEAVES]=AOS[B.ACACIA_LEAVES]=true;
export const HOTBAR = [B.GRASS,B.STONE,B.COBBLE,B.PLANKS,B.LOG,B.LEAVES,B.GLASS,B.SAND,B.BRICK];
export const NEIGH = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
export const HARDNESS = {
  [B.GRASS]:0.65,[B.DIRT]:0.55,[B.SAND]:0.5,[B.LOG]:1.25,[B.PLANKS]:1.25,
  [B.LEAVES]:0.2,[B.STONE]:2.0,[B.COBBLE]:2.2,[B.BRICK]:2.2,[B.GLASS]:0.4,
  [B.SNOW]:0.3,[B.CRAFT]:1.25,[B.COAL_ORE]:3.0,[B.IRON_ORE]:3.2,[B.DIAMOND_ORE]:3.5,
  [B.FURNACE]:3.5,[B.CHEST]:1.25,[B.OBSIDIAN]:8,[B.NETHERRACK]:0.45,[B.GLOWSTONE]:0.4,
  [B.END_STONE]:1.6,[B.RED_SAND]:0.5,[B.TERRACOTTA]:1.6,[B.AMETHYST]:1.8,[B.CALCITE]:0.8,
  [B.SMOOTH_STONE]:2.0,[B.GRAVEL]:0.6,[B.CLAY]:0.6,[B.DARK_PRISMARINE]:1.6,
  [B.MOSSY_COBBLE]:2.2,[B.TERRACOTTA_ORANGE]:1.6,[B.TERRACOTTA_YELLOW]:1.6,
  [B.BIRCH_LOG]:1.25,[B.BIRCH_LEAVES]:0.2,[B.SPRUCE_LOG]:1.25,[B.SPRUCE_LEAVES]:0.2,
  [B.ACACIA_LOG]:1.25,[B.ACACIA_LEAVES]:0.2,
  [B.PORTAL]:Infinity,[B.END_PORTAL]:Infinity,[B.END_FRAME]:Infinity,[B.END_FRAME_EYE]:Infinity,
  [B.LAVA]:Infinity,[B.BEDROCK]:Infinity,[B.WATER]:Infinity
};
export const DROPS = { [B.GRASS]:B.DIRT, [B.STONE]:B.COBBLE,
  [B.COAL_ORE]:IT.COAL, [B.IRON_ORE]:IT.RAW_IRON, [B.DIAMOND_ORE]:IT.DIAMOND,
  [B.NETHERRACK]:B.NETHERRACK, [B.GLOWSTONE]:B.GLOWSTONE,
  [B.END_STONE]:B.END_STONE, [B.OBSIDIAN]:B.OBSIDIAN,
  [B.BIRCH_LOG]:B.BIRCH_LOG, [B.SPRUCE_LOG]:B.SPRUCE_LOG, [B.ACACIA_LOG]:B.ACACIA_LOG,
  [B.RED_SAND]:B.RED_SAND, [B.TERRACOTTA]:B.TERRACOTTA, [B.AMETHYST]:B.AMETHYST,
  [B.CALCITE]:B.CALCITE, [B.SMOOTH_STONE]:B.SMOOTH_STONE, [B.GRAVEL]:B.GRAVEL,
  [B.CLAY]:B.CLAY, [B.DARK_PRISMARINE]:B.DARK_PRISMARINE, [B.MOSSY_COBBLE]:B.MOSSY_COBBLE,
  [B.TERRACOTTA_ORANGE]:B.TERRACOTTA_ORANGE, [B.TERRACOTTA_YELLOW]:B.TERRACOTTA_YELLOW };
export const PICKS = new Set([B.STONE,B.COBBLE,B.BRICK,B.GLASS,B.COAL_ORE,B.IRON_ORE,B.DIAMOND_ORE,
  B.FURNACE,B.OBSIDIAN,B.NETHERRACK,B.END_STONE,B.GLOWSTONE,B.TERRACOTTA,
  B.CALCITE,B.SMOOTH_STONE,B.DARK_PRISMARINE,B.MOSSY_COBBLE,
  B.TERRACOTTA_ORANGE,B.TERRACOTTA_YELLOW,B.AMETHYST]);
export const AXES  = new Set([B.LOG,B.PLANKS,B.CRAFT,B.CHEST,B.BIRCH_LOG,B.SPRUCE_LOG,B.ACACIA_LOG]);
export const PICK_TIER = { [IT.WOOD_PICK]:1,[IT.STONE_PICK]:2,[IT.IRON_PICK]:3,[IT.DIAMOND_PICK]:4 };
export const ORE_TIER  = { [B.STONE]:1,[B.COBBLE]:1,[B.BRICK]:1,[B.FURNACE]:1,[B.COAL_ORE]:1,
  [B.IRON_ORE]:2,[B.DIAMOND_ORE]:3,[B.OBSIDIAN]:4,[B.END_STONE]:1,[B.TERRACOTTA]:1,
  [B.CALCITE]:1,[B.SMOOTH_STONE]:1,[B.DARK_PRISMARINE]:1,[B.MOSSY_COBBLE]:1,
  [B.TERRACOTTA_ORANGE]:1,[B.TERRACOTTA_YELLOW]:1,[B.AMETHYST]:2 };

const P=B.PLANKS, C=B.COBBLE, I=IT.IRON_INGOT, D=IT.DIAMOND, S=IT.STICK;
export const RECIPES = [
  {out:B.PLANKS, n:4, any:[B.LOG]},
  {out:B.PLANKS, n:4, any:[B.BIRCH_LOG]},
  {out:B.PLANKS, n:4, any:[B.SPRUCE_LOG]},
  {out:B.PLANKS, n:4, any:[B.ACACIA_LOG]},
  {out:IT.STICK, n:4, pattern:[[P],[P]]},
  {out:B.CRAFT,  n:1, pattern:[[P,P],[P,P]]},
  {out:B.FURNACE,n:1, pattern:[[C,C,C],[C,0,C],[C,C,C]]},
  {out:B.CHEST,  n:1, pattern:[[P,P,P],[P,0,P],[P,P,P]]},
  {out:B.BRICK,  n:1, pattern:[[C,C],[C,C]]},
  {out:IT.BUCKET,n:1, pattern:[[I,0,I],[0,I,0]]},
  {out:IT.FLINT_STEEL,n:1, any:[IT.IRON_INGOT, B.COBBLE]},
  {out:IT.BLAZE_POWDER,n:2, any:[IT.BLAZE_ROD]},
  {out:IT.ENDER_EYE, n:1, any:[IT.BLAZE_POWDER, IT.ENDER_PEARL]},
  {out:IT.WOOD_PICK, n:1, pattern:[[P,P,P],[0,S,0],[0,S,0]]},
  {out:IT.STONE_PICK,n:1, pattern:[[C,C,C],[0,S,0],[0,S,0]]},
  {out:IT.IRON_PICK, n:1, pattern:[[I,I,I],[0,S,0],[0,S,0]]},
  {out:IT.DIAMOND_PICK,n:1, pattern:[[D,D,D],[0,S,0],[0,S,0]]},
  {out:IT.WOOD_AXE,  n:1, pattern:[[P,P],[P,S],[0,S]]},
  {out:IT.STONE_AXE, n:1, pattern:[[C,C],[C,S],[0,S]]},
  {out:IT.IRON_AXE,  n:1, pattern:[[I,I],[I,S],[0,S]]},
  {out:IT.DIAMOND_AXE,n:1, pattern:[[D,D],[D,S],[0,S]]},
  {out:IT.WOOD_SWORD, n:1, pattern:[[P],[P],[S]]},
  {out:IT.STONE_SWORD,n:1, pattern:[[C],[C],[S]]},
  {out:IT.IRON_SWORD, n:1, pattern:[[I],[I],[S]]},
  {out:IT.DIAMOND_SWORD,n:1, pattern:[[D],[D],[S]]},
];
export const SMELT_T = 2;
export const SMELT = { [IT.RAW_IRON]:IT.IRON_INGOT, [B.SAND]:B.GLASS, [B.COBBLE]:B.STONE,
  [IT.RAW_PORK]:IT.COOKED_PORK, [IT.RAW_BEEF]:IT.STEAK, [IT.RAW_CHICKEN]:IT.COOKED_CHICKEN,
  [B.CLAY]:B.BRICK };
export const FUEL = { [IT.COAL]:16, [B.PLANKS]:3, [B.LOG]:3, [IT.STICK]:1,
  [B.BIRCH_LOG]:3, [B.SPRUCE_LOG]:3, [B.ACACIA_LOG]:3 };
export const RING = [];
for(let dx=-2;dx<=2;dx++) for(let dz=-2;dz<=2;dz++){
  if(Math.max(Math.abs(dx),Math.abs(dz))===2 && !(Math.abs(dx)===2&&Math.abs(dz)===2)) RING.push([dx,dz]);
}
