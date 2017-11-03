/* istanbul ignore next */
export default function deprecate (message, fn) {
	return function (...args) {
		console.warn(message);
		return fn.bind(this)(...args);
	};
};
