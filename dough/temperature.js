/** Standard bakery factor method. All internal temperatures and friction are °C. */
export const toC=(v,unit='C',difference=false)=>unit==='F'?(v-(difference?0:32))*5/9:v;
export const fromC=(v,unit='C',difference=false)=>unit==='F'?v*9/5+(difference?0:32):v;
export function doughTemperature({desired,room,flour,preferment=24,friction=6,water=25,actual=26,withPreferment=false,mode='water'}){
 const values={desired,room,flour,friction,...(withPreferment?{preferment}:{}),...(mode==='friction'?{water,actual}:{})};
 for(const [name,v] of Object.entries(values))if(typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>200)throw Error(`Enter a valid ${name} temperature.`);
 if(!['water','friction'].includes(mode))throw Error('Choose water temperature or friction calibration.');
 const factors=withPreferment?4:3,other=room+flour+(withPreferment?preferment:0);
 return {factors,value:mode==='friction'?actual*factors-other-water:desired*factors-other-friction,mode};
}
