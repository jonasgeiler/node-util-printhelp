export class StringBuilder {
	#buf: string[] = [];
	#len: number = 0;

	public toString() {
		return this.#buf.join("");
	}

	public get length() {
		return this.#len;
	}

	public write(str: string) {
		this.#buf.push(str);
		this.#len += str.length;
	}
}
