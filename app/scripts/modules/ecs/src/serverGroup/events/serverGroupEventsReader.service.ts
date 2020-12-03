import { $log } from 'ngimport';

import { API, IServerGroup } from '@spinnaker/core';

export interface IEventDescription {
  createdAt: number;
  message: string;
  id: string;
  status: string;
}

export class ServerGroupEventsReader {
  public static getEvents(serverGroup: IServerGroup): PromiseLike<IEventDescription[]> {
    return API.path('applications')
      .path(serverGroup.app)
      .path('serverGroups')
      .path(serverGroup.account)
      .path(serverGroup.name)
      .path('events')
      .query({
        region: serverGroup.region,
        provider: serverGroup.cloudProvider,
      })
      .get()
      .catch((error: any): any[] => {
        $log.error(error, 'error retrieving events');
        return [];
      });
  }
}
