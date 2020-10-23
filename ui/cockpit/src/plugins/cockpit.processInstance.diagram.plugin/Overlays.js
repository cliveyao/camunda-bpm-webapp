/*
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership. Camunda licenses this file to you under the Apache License,
 * Version 2.0; you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useEffect, useMemo, useState } from "react";
import { get } from "utils/request";
import withFilter from "../../components/ProcessInstance/HOC/withFilter";
import { addMouseInteraction, configureFilter } from "./mouseInteraction";
import addInstanceCount from "./instanceCount";

function generateActivityMap(rootActivity) {
  if (!rootActivity) return [null, null];
  const activityIdToInstancesMap = {};
  const activityIdToIncidentsMap = {};

  function addIncidents(incidents) {
    incidents.forEach(function(incident) {
      let savedIncidents = activityIdToIncidentsMap[incident.activityId] || [];
      savedIncidents.push(incident.id);
      activityIdToIncidentsMap[incident.activityId] = savedIncidents;
    });
  }

  function decorateActivityInstanceTree(instance) {
    const children = instance.childActivityInstances;

    if (children && children.length > 0) {
      for (let i = 0, child; (child = children[i]); i++) {
        const activityId = child.activityId,
          instances = activityIdToInstancesMap[activityId] || [];

        child.name = activityId;
        child.isTransitionInstance = false;
        activityIdToInstancesMap[activityId] = instances;

        addIncidents(child.incidents);

        instances.push(child);

        decorateActivityInstanceTree(child);
      }
    }

    const transitions = instance.childTransitionInstances;
    if (transitions && transitions.length > 0) {
      for (let t = 0, transition; (transition = transitions[t]); t++) {
        const targetActivityId = transition.targetActivityId,
          transitionInstances =
            activityIdToInstancesMap[targetActivityId] || [];

        transition.name = targetActivityId;

        transition.isTransitionInstance = true;
        activityIdToInstancesMap[targetActivityId] = transitionInstances;

        addIncidents(transition.incidents);

        transitionInstances.push(transition);
      }
    }
  }
  decorateActivityInstanceTree(rootActivity);

  return [activityIdToInstancesMap, activityIdToIncidentsMap];
}

function Overlays({ filter, setFilter, viewer, processInstanceId }) {
  // We probably want to provide this as a Context as well
  const [activityInstances, setActivityInstances] = useState();

  useEffect(() => {
    const fetchActivityInstances = async () => {
      setActivityInstances(
        await (
          await get(
            `%ENGINE_API%/process-instance/${processInstanceId}/activity-instances`
          )
        ).json()
      );
    };

    fetchActivityInstances();
  }, [processInstanceId]);

  const [activityIdToInstancesMap, activityIdToIncidentsMap] = useMemo(
    () => generateActivityMap(activityInstances),
    [activityInstances]
  );

  useEffect(() => {
    if (activityIdToInstancesMap) {
      addInstanceCount(
        viewer,
        activityIdToInstancesMap,
        activityIdToIncidentsMap
      );
      addMouseInteraction(
        viewer,
        activityIdToInstancesMap,
        activityIdToIncidentsMap
      );
    }
  }, [viewer, activityIdToInstancesMap, activityIdToIncidentsMap]);

  useEffect(() => {
    configureFilter(filter, setFilter);
  }, [filter, setFilter]);

  return null;
}

export default withFilter(Overlays);
