// Historical observed comparison records; never imported by application code.
const classic = [[115,19750,0.00001,118,0,70],[180,50000,50000,216,88,98],[190,50000,50000,228,168,98],[200,50000,50000,240,252,98],[210,50000,50000,294,372,98],[220,50000,50000,322,495,98],[240,50000,50000,336,803,86],[250,50000,50000,350,1033,86],[260,50000,50000,416,1270,86],[269,50000,50000,432,1694,81],[270,50000,50000,432,1570,81],[300,50000,50000,480,2470,62]];
export const LEGACY_CLASSIC_ENEMIES = Object.fromEntries(classic.map(([round,hp,shield,count,armor,seconds]) => [round,{round,hp,shield,count,armor,shieldArmor:armor,seconds}]));
const toc = [[70,161,60,5],[71,168,62,6],[72,200,62,6],[73,208,62,7],[74,216,63,7],[75,232,63,8],[76,288,65,8],[77,315,65,9],[78,380,65,9],[79,451,65,10],[80,528,68,10],[81,637,68,11],[82,756,72,11],[83,784,72,12],[84,855,72,12]];
export const LEGACY_TOC_ENEMIES = Object.fromEntries(toc.map(([round,count,seconds,torment]) => [round,{round,hp:50000,shield:50000,count,armor:1530,shieldArmor:1530,seconds,torment}]));

