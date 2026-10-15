/**
 * Check if the given object is a valid non-undefined, non-empty object.
 * @param obj
 */
export function isNonEmptyObject(obj: object | undefined): obj is object {
	if (!obj) {
		return false;
	}
	for (const key in obj) {
		if (Object.hasOwn(obj, key)) {
			return true;
		}
	}
	return false;
}
