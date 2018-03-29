
import BackgroundWorker from 'background-worker'
import Promise  				from 'bluebird'
import Observable			 from 'zen-observable'
import {AsyncTask} 			from './AsyncTask'


/**
 * Factory Pool
 */
export default function Pool({
	debug = false,
	nrOfWorkers = 1
} = options) {
 	const workerpool = WorkerPool.createWorkerpool(options)
	return workerpool
}


export class WorkerPool {

	static createObservable(subscriber) {
		return new Observable(subscriber)
	}

	static createWorkerpool({nrOfWorkers}) {
		return new WorkerPool({nrOfWorkers})
	}

	static createWorkers({nrOfWorkers}) {
		let workers = []
		for(let i = 0; i < nrOfWorkers; i++) {
			let worker = new BackgroundWorker({})
			workers.push(worker)
		}
		return workers
	}

	constructor({nrOfWorkers}) {
		this.workers = WorkerPool.createWorkers({nrOfWorkers})
	}

	terminate() {
		return Promise.map(this.workers,
			worker => worker.terminate())
	}

	series(asynctasks = []) {
		return Promise.mapSeries(asynctasks, task => {
			return this.pickWorker()
				.then(worker => {
					task.setWorker(worker)
					task.keepAlive = true
					return task.execute()
				})
		})
	}

	pickWorker() {
		return Promise.resolve(this.workers[0])
	}

}
