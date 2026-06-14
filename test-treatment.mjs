import { detectFertilizerTreatment, defaultFertilizer } from './api/services/coreService.js';

console.log('默认方案分类:', detectFertilizerTreatment(defaultFertilizer()));

// 测试4次施肥+控释肥25%占比 - 应该是优化施肥
const plan1 = {
  applications: [
    { date: 'D0', type: '控释肥', amount: 180, method: '基肥深施' },
    { date: 'D30', type: '尿素', amount: 80, method: '追肥' },
    { date: 'D60', type: '尿素', amount: 60, method: '追肥' },
    { date: 'D90', type: '磷酸二氢钾', amount: 15, method: '叶面' },
  ]
};
console.log('4次施肥+控释肥25%占比:', detectFertilizerTreatment(plan1));

// 测试控释肥占比>50% - 应该是控释肥
const plan2 = {
  applications: [
    { date: 'D0', type: '控释肥', amount: 300, method: '基肥深施' },
    { date: 'D60', type: '尿素', amount: 50, method: '追肥' },
  ]
};
console.log('控释肥占比>50%:', detectFertilizerTreatment(plan2));

// 测试总施肥量280 - 应该是减氮20%
const plan3 = {
  applications: [
    { date: 'D0', type: '尿素', amount: 150, method: '基肥' },
    { date: 'D30', type: '尿素', amount: 130, method: '追肥' },
  ]
};
console.log('总施肥量280:', detectFertilizerTreatment(plan3));

// 测试有机肥 - 应该是有机替代
const plan4 = {
  applications: [
    { date: 'D0', type: '有机肥', amount: 200, method: '基肥' },
    { date: 'D30', type: '尿素', amount: 100, method: '追肥' },
  ]
};
console.log('有机肥:', detectFertilizerTreatment(plan4));

// 测试新增的种子数据优化施肥方案
const plan6 = {
  applications: [
    { date: 'D0', type: '控释肥', amount: 120, method: '基肥深施' },
    { date: 'D30', type: '尿素', amount: 100, method: '追肥' },
    { date: 'D60', type: '尿素', amount: 80, method: '追肥' },
    { date: 'D90', type: '磷酸二氢钾', amount: 20, method: '叶面喷施' },
  ]
};
const total6 = plan6.applications.reduce((a, b) => a + b.amount, 0);
const crAmount6 = plan6.applications.filter(a => a.type.includes('控释')).reduce((a, b) => a + b.amount, 0);
console.log(`新增优化方案: 总${total6}kg, 控释肥占比${(crAmount6/total6*100).toFixed(1)}%, ${plan6.applications.length}次 →`, detectFertilizerTreatment(plan6));

