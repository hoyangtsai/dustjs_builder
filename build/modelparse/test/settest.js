var set = new Set();
set.add(1);
set.add(2);

var setIter = set.values();
console.log(setIter.next().value);
set.add(3);
console.log(setIter.next().value);
console.log(setIter.next().value);