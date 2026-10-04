// PX RSP reference
// Source: RSP.xlsx (工作表1)
// Source SHA-256: de095c38800c2b74f94b5b3e5024015e775d13c5a9092f4b0e46ba5ac8140343
// Missing source values remain null; never inferred. Display only, not calculation inputs.
window.PX_RSP_DATA = Object.freeze({
  "OP專科防臭袋S": 269,
  "OP專科防臭袋M": 269,
  "OP安全無毒耐熱袋(小)PX(二)": 99,
  "OP安全無毒耐熱袋(中)PX(二)": 99,
  "OP生物抗菌密封袋M(PX)": null,
  "OP生物抗菌密封袋L(PX)": null,
  "OP生物分解抗菌密封袋XL": 199,
  "OP抗菌立體密封袋M+L": 110,
  "OP長效抗菌立體密封袋M": 110,
  "OP生物分解抗菌立體密封袋S": null,
  "OP生物分解保鮮膜360尺(20入)": 128,
  "OP植材抗菌保鮮膜300尺": 289,
  "OP無雙酚A鋁箔800公分-12入": 110,
  "OP無雙酚A鋁箔1500公分-12入": 221,
  "OP無雙酚A料理紙32M(12入)": 399,
  "OP無漂白料理紙7M(加量)": 179,
  "OP加長保護手套耐用強化 M": 106,
  "OP環保舒適手套-綠茶香氛M(橘)": 139,
  "OP環保舒適手套-綠茶香氛L(橘)": 139,
  "OP環保舒適手套-綠茶香氛S": 139,
  "OP超音波馬卡龍瞬吸布PX": 117,
  "OP檸檬清新抗菌瞬吸布": 199,
  "OP天然棉紗布(3片入)": 99,
  "德適淨濕拖巾-薰衣草": 129,
  "德適淨濕拖巾-雪松清香": 129,
  "德適淨濕拖巾-海洋清新": 129,
  "OP柑橘抗菌EX菜瓜布(三)": 99,
  "OP細柔無砂海綿菜瓜布": 139,
  "OP抗菌木漿棉": 139,
  "檸檬馬鞭草菜瓜布-萬用速淨4入": 139,
  "OP生物分解濾水網80入": 119,
  "OP咖啡渣淨味濾水網80入(PX)": 79,
  "Amaze大地擴香-甜橘玫瑰果": 338,
  "AMAZE經典擴香-雪松中性淡香水": 359,
  "AMAZE經典擴香-白麝香琥珀淡香水": 359,
  "AMAZE 礦石香氛包-雪松中性淡香水": 159,
  "AMAZE 礦石香氛包-白麝香琥珀淡香水": 159,
  "Amaze礦石香氛-玫瑰淡香水": 159,
  "礦石香氛-沁藍海洋淡香水": 159,
  "礦石香氛-月光舒眠薰衣草": 159,
  "香氛豆補充包-玫瑰淡香水(二)": 238,
  "香氛豆補充包-海洋中性白麝香(二)": 238,
  "香氛豆-粉紅甜蜜果香淡香水": null,
  "香氛豆-鳶尾粉邂逅淡香水": 359,
  "OP日本愛宕柿小蘇打(二)": 138,
  "OP愛岩柿消臭噴霧-抗病毒EX(黃)": 298,
  "OP抗菌消臭噴霧-清新海洋": 298,
  "茶酚淨洗潔精-清雅茶香(黃)": 349,
  "茶酚淨洗潔精-檸檬茶萃(黃)": 279,
  "茶酚淨洗潔精補充包-茶香(黃)": 282,
  "德適淨十抗菌酒精擦(PX)": 179,
  "凝膠型除濕袋-雪松清香": 159,
  "OP指尖強化手套-薰衣紫M": 129,
  "OP指尖強化手套-薰衣紫L": 129,
  "Amaze 法國淡香水香氛豆-挪威雪松森林-(補充包)": 359
});
window.PX_RSP_REFERENCE = Object.freeze({
 resolve(product) {
  const name = typeof product === 'string' ? product : product?.name;
  const value = Object.hasOwn(window.PX_RSP_DATA, name) ? window.PX_RSP_DATA[name] : null;
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
 },
 format(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
   ? '$' + new Intl.NumberFormat('zh-TW', {maximumFractionDigits:2}).format(value) : '—';
 }
});
