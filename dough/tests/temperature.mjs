import assert from 'node:assert/strict';import {doughTemperature,toC,fromC} from '../temperature.js';
const base={desired:26,room:22,flour:22,friction:6};assert.equal(doughTemperature(base).value,28);assert.equal(doughTemperature({...base,withPreferment:true,preferment:24}).value,30);assert.equal(doughTemperature({...base,mode:'friction',actual:26,water:28}).value,6);assert.equal(doughTemperature({...base,mode:'friction',actual:26,water:30,withPreferment:true,preferment:24}).value,6);assert.equal(toC(32,'F'),0);assert.equal(fromC(0,'F'),32);assert.ok(Math.abs(toC(fromC(26,'F'),'F')-26)<1e-10);assert.equal(fromC(6,'F',true),10.8);assert.equal(toC(10.8,'F',true),6);assert.throws(()=>doughTemperature({...base,desired:null}));assert.throws(()=>doughTemperature({...base,room:NaN}));assert.throws(()=>doughTemperature({...base,flour:Infinity}));console.log('PASS straight/prefermented water temperature, both friction calibrations, C/F absolute/delta conversion, invalid inputs');
// Calibration does not depend on hidden water-calculation fields, and vice versa.
assert.equal(doughTemperature({...base,desired:null,friction:null,mode:'friction',actual:26,water:28}).value,6);
assert.equal(doughTemperature({...base,water:null,actual:null,preferment:null}).value,28);
for(const withPreferment of [false,true])for(const actual of [20,24,28])for(const room of [15,22,30])for(const friction of [0,6,12]){
 const values={desired:actual,actual,room,flour:21,preferment:23,friction,withPreferment};
 const water=doughTemperature(values).value;
 assert.ok(Math.abs(doughTemperature({...values,water,mode:'friction'}).value-friction)<1e-10);
}
console.log('PASS 54 reverse-calibration cases; hidden inactive fields do not block valid calculations');
