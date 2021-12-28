import { Worker, parentPort, isMainThread } from "worker_threads";
import { uniqSeed } from "./crypto.js";
import { assert, log } from "./diagnostics.js";
import { dig } from "./object.js";
// Static service pool
export const Service = {
	async init(...services) {
		assert(Array.isArray(services));
		// Info
		log.info('[Service]', 'Initializing services');
		// Service list can only be initialized ONCE
		delete this.init;
		const $ = {};
		for (const serviceName of services) {
			assert(!(serviceName in this));
			this[serviceName] = new ServiceProxy(serviceName);
			await this[serviceName].$init();
			$[serviceName] = this[serviceName].$commands;
		}
		for (const serviceName of services) {
			assert((serviceName in this));
			this[serviceName].$init($);
		}
		// Prevent further modification
		Object.freeze(this);
		// Info (done)
		log.info('[Service]', `Services activated: ${Object.keys(this).map(el => `[${el}]`).join(' ')}`);
	}
};
export class ServiceProxy {
	#worker;
	#workerName;
	#commands;
	get $commands() { return [...this.#commands]; }
	get $name() { return this.#workerName; };
	#QueryPool = {};
	constructor(workerName) {
		this.#workerName = workerName;
		this.#worker = new Worker(`./${workerName}.js`);
		this.#worker.on('error', err => {
			log.error(this, `Worker ${this.#workerName} throwed uncaught error:\n${err.stack}`);
		})
		this.#worker.on('exit', code => {
			log.error(this, `Worker ${this.#workerName} exited with code ${code}`);
			this.#worker = undefined;
		})
		this.#worker.on('message', message => {
			const { qid, proc, cmd, data, error } = message;
			if (cmd !== undefined) {
				// const [serviceName, command] = cmd.split(".");
				if (cmd == "$log") {
					console.log(data);
				} else {
					if (dig(Service, proc, cmd)) {
						// const result = Service[serviceName][command](...data);
						const result = Service[proc].$(cmd, data, this.#workerName);
						if (result instanceof Promise) {
							result
								.then(data => this.#worker.postMessage({ qid, data }))
								.catch(error => this.#worker.postMessage({ qid, error }));
						} else {
							let data = result;
							this.#worker.postMessage({ qid, data })
						}
					} else {
						this.#worker.postMessage({ qid, error: Error(`invalid command: ${cmd}`) })
					}
				}
			} else {
				if (qid) {
					const promise = this.#QueryPool[qid];
					if (promise) {
						try {
							const { res, rej } = promise;
							if (!error) {
								res(data);
							} else {
								rej(error);
							}
						} catch (e) {
							log.error(this, e.stack);
						}
					} else {
						log.warn(`[ServiceProxy] [${this.$name}] qid '${qid}' not existent in QueryPool.`)
					}
					delete this.#QueryPool[qid];
				} else {
					log.error(`[ServiceProxy] [${this.$name}] Got message without qid specified: \n${JSON.stringify(message, null, '\t')}`);
				}
			}
		});
		this.#worker.on('error', e => {
			log.error(`[ServiceProxy] [${this.$name}] INTERNAL ${e.stack}`);
		});
	}
	$(cmd, data, src = null) {
		if (!this.#worker) return undefined;
		const qid = uniqSeed(seed => seed in this.#QueryPool);
		return new Promise((res, rej) => {
			this.#QueryPool[qid] = { res, rej };
			this.#worker.postMessage({
				qid,
				src,
				cmd,
				data
			});
		});
	}
	async $init(list = undefined) {
		if (!list) {
			await this.$('$').then(commands => {
				this.#commands = commands;
				for (const command of commands) {
					this[command] = (el => {
						const cmd = command;
						return (...data) => el.$(cmd, data);
					})(this);
				}
				Object.freeze(this);
			})
		} else {
			this.$('$', list);
		}
	}
}
export class ServiceWorker {
	#commands;
	#QueryPool = {};
	$onHalt() { }
	$onInit() { }
	/**
	 * Register a workerThread with given commands.
	 * Method name will be used for cmd lookup.
	 * @param {...Function} commands 
	 */
	constructor({ ...commands }) {
		for (const methodName in commands) {
			assert(typeof commands[methodName] === 'function');
			if (methodName === "$halt") {
				this.$onHalt = commands[methodName];
				delete commands[methodName];
			}
			if (methodName === "$init") {
				this.$onInit = commands[methodName];
				delete commands[methodName];
			}
		}
		this.#commands = commands;
		Object.freeze(this.#commands);
		// Listen for query from main thread
		if (!isMainThread) {
			parentPort.on('message', ({ qid, proc, cmd, data, error }) => {
				try {
					if (cmd !== undefined) {
						if (cmd === '$') {
							if (!data)
								// Echo back all supported commands
								parentPort.postMessage({
									qid,
									data: Object.keys(this.#commands)
								});
							else {
								instantiate(data, this);
								this.$onInit();
							}
							return;
						}
						if (cmd === '$halt') {
							log.info("Received SIG_INT");
							(async () => await this.$onHalt())().then(() => {
								parentPort.postMessage({ qid });
								process.exit(0);
							}).catch(error => parentPort.postMessage({ qid, error }));
							return;
						}
						assert(cmd in this.#commands);
						const result = this.#commands[cmd](...data);
						if (result instanceof Promise) {
							result
								.then(data => parentPort.postMessage({ qid, data }))
								.catch(error => parentPort.postMessage({ qid, error }));
						} else {
							let data = result;
							parentPort.postMessage({ qid, data })
						}
					} else {
						if (qid) {
							const promise = this.#QueryPool[qid];
							if (promise) {
								try {
									const { res, rej } = promise;
									if (!error) {
										res(data);
									} else {
										rej(error);
									}
								} catch (e) {
									log.error(this, e.stack);
								}
							} else {
								log.warn(this, `[ServiceWorker] qid '${qid}' not existant in QueryPool.`)
							}
							delete this.#QueryPool[qid];
						} else {
							log.error(this, `[ServiceWorker] Got message without qid specified: \n${JSON.stringify(message, null, '\t')}`);
						}
					}
				} catch (error) {
					parentPort.postMessage({ qid, error })
				}
			})
		}
	}
	call(command, data) {
		if (!isMainThread) {
			// const data = args;
			const qid = uniqSeed(seed => seed in this.#QueryPool);
			const [proc, cmd] = command.split(".");
			return new Promise((res, rej) => {
				this.#QueryPool[qid] = { res, rej };
				parentPort.postMessage({
					qid,
					proc,// name of Service process
					cmd,
					data
				});
			});
		}
	}
}
function instantiate(list, target = {}) {
	for (const serviceName of Object.keys(list)) {
		target[serviceName] = {};
		for (const method of list[serviceName]) {
			target[serviceName][method] = (el => {
				return (...data) =>
					(el.call(`${serviceName}.${method}`, data));
			})(target)
		}
	}
}