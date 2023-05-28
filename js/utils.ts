export function checkUrl(val: string) {
  const v = new RegExp('^(?!mailto:)(?:(?:http|https|ftp)://|//)(?:\\S+(?::\\S*)?@)?(?:(?:(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[0-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,})))|localhost)(?::\\d{2,5})?(?:(/|\\?|#)[^\\s]*)?$', 'i');
  return v.test(val);
}

export function parseJson(content: any): { [key: string]: any } | null {
  try {
    const result = JSON.parse(content);
    if (isObject(result)) {
      return result;
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * 判断是否为对象
 * @param {Object} obj
 */
export function isObject(obj: unknown): obj is { [key: string]: unknown } {
  return obj !== null && obj instanceof Object;
}

export function delay(time: number) {
  return new Promise<void>(resolve => setTimeout(resolve, time));
}
