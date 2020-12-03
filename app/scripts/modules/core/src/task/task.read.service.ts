import { $log, $q, $timeout } from 'ngimport';
import { Subject } from 'rxjs';

import { API } from 'core/api/ApiService';
import { OrchestratedItemTransformer } from 'core/orchestratedItem/orchestratedItem.transformer';
import { ITask } from 'core/domain';

export class TaskReader {
  private static activeStatuses: string[] = ['RUNNING', 'SUSPENDED', 'NOT_STARTED'];

  public static getTasks(applicationName: string, statuses: string[] = []): PromiseLike<ITask[]> {
    return API.path('applications', applicationName)
      .path('tasks')
      .get({ statuses: statuses.join(',') })
      .then((tasks: ITask[]) => {
        tasks.forEach((task) => this.setTaskProperties(task));
        return tasks.filter((task) => !task.getValueFor('dryRun'));
      });
  }

  public static getRunningTasks(applicationName: string): PromiseLike<ITask[]> {
    return this.getTasks(applicationName, this.activeStatuses);
  }

  public static getTask(taskId: string): PromiseLike<ITask> {
    return API.path('tasks', taskId)
      .get()
      .then((task: ITask) => {
        this.setTaskProperties(task);
        if (task.execution) {
          OrchestratedItemTransformer.defineProperties(task.execution);
          if (task.execution.stages) {
            task.execution.stages.forEach((stage: any) => OrchestratedItemTransformer.defineProperties(stage));
          }
        }
        return task;
      })
      .catch((error: any): undefined => {
        $log.warn('There was an issue retrieving taskId: ', taskId, error);
        return undefined;
      });
  }

  public static waitUntilTaskMatches(
    task: ITask,
    closure: (task: ITask) => boolean,
    failureClosure?: (task: ITask) => boolean,
    interval = 1000,
    notifier?: Subject<void>,
  ): PromiseLike<ITask> {
    const deferred = $q.defer<ITask>();
    if (!task) {
      deferred.reject(null);
    } else if (closure(task)) {
      deferred.resolve(task);
    } else if (failureClosure && failureClosure(task)) {
      deferred.reject(task);
    } else {
      task.poller = $timeout(() => {
        this.getTask(task.id).then((updated) => {
          this.updateTask(task, updated);
          notifier?.next();
          this.waitUntilTaskMatches(task, closure, failureClosure, interval, notifier).then(
            deferred.resolve,
            deferred.reject,
          );
        });
      }, interval);
    }
    return deferred.promise;
  }

  public static waitUntilTaskCompletes(task: ITask, interval = 1000, notifier?: Subject<void>): PromiseLike<ITask> {
    return this.waitUntilTaskMatches(
      task,
      (t) => t.isCompleted,
      (t) => t.isFailed,
      interval,
      notifier,
    );
  }

  /**
   * When polling for a match, (most of) the new task's properties are copied into the original task; if you need
   * some other property, you'll need to update this method
   */
  private static updateTask(original: ITask, updated?: ITask): void {
    if (!updated) {
      return;
    }
    original.status = updated.status;
    original.variables = updated.variables;
    original.steps = updated.steps;
    original.endTime = updated.endTime;
    original.execution = updated.execution;
    original.history = updated.history;
  }

  private static setTaskProperties(task: ITask): void {
    OrchestratedItemTransformer.defineProperties(task);
    if (task.steps && task.steps.length) {
      task.steps.forEach((step) => OrchestratedItemTransformer.defineProperties(step));
    }
  }
}
