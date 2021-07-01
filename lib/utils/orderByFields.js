const matcher = /(desc|asc)\((.*?)\)/g;

function dynamicSort (property, direction = 1) {
  return function (a, b) {
    const result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
    return result * direction;
  };
}

function orderByFields (order, results) {
  [...order.matchAll(matcher)]
    .forEach(field => {
      const fieldName = field[2];
      const fieldDirection = field[1];
      results.sort(dynamicSort(fieldName, fieldDirection === 'asc' ? 1 : -1));
    });
}

export default orderByFields;
