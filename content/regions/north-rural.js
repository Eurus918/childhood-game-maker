/**
 * 北方农村 —— 1990–2005
 *
 * 这是本项目最厚的一份素材，也是唯一「全场景」的地域：
 * 院子 / 屋里 / 果园 / 小溪 / 田埂 五个场景全部解锁，四季玩法都在。
 * 底图是照着真实北方农村院落画的水彩（assets/scenes/*.jpg）。
 *
 * 素材作者请注意：description 里只写「那个年代真实存在的东西」，
 * 不要写想象的田园牧歌。土墙、麦垛、杨树上的知了、院门口的压水井，
 * 这些不浪漫但准确的细节，才是让人一下认出来的东西。
 */

export default {
  id: 'north-rural',
  name: '北方农村',
  era: ['1990-2005'],
  houseKind: 'tile',
  multi: true,
  startSeason: 1, // 从夏天开始：知了叫着，溪里有鱼
  activities: [
    'fish', 'fishing', 'worms',
    'pick', 'cicada', 'nymph',
    'eggs', 'garden', 'grasshopper',
    'bake', 'kang'
  ],
  keywords: ['北方', '农村', '村', '瓦房', '土墙', '华北', '山东', '河北', '河南', '麦', '院子'],
  description: '三间瓦房，屋里一铺连着灶台的土炕；院子里压水井、柴垛、鸡窝；屋后是果园，村东头一条小溪。土坯墙、麦秸垛、院门口一棵老槐树，夏天整个村子都是知了叫。',
  reply: '北方农村。三间瓦房，屋里一铺土炕连着灶台；院子里压水井、柴垛、鸡窝；屋后一园子果树，村东头一条小溪。四季都在里面——春天抓蚂蚱，夏天摸鱼粘知了，秋天摘果子，冬天坐炕上烤鹅蛋。',
  palette: {
    ground: '#d9c08a', groundAlt: '#c8af76', path: '#c2a877',
    bank: '#b8a06a', water: '#5b93ad', waterDeep: '#4a829c', reed: '#7d8a4a',
    wheat: '#c9a94e', wheatDark: '#b0923a',
    wall: '#d8c49a', wallBase: '#a8926b', roof: '#8a5f45', window: '#7d9fb0',
    leaf: '#4f7f3c', leafLight: '#5f9247', aspen: '#58923f',
    fruit: ['#d8453f', '#e0a13a', '#c8507a']
  }
};
