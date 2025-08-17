import { Route, Switch } from "wouter";
import { RouteTripTaskListTask } from "../../Routes/routes";
import { Flex } from "@radix-ui/themes";
import { TaskDialog } from "./TaskDialog/TaskDialog";

export function TripTaskList() {
  return <>
    <Flex>
       Task list

    </Flex>
  
  
      <Switch>
        <Route
          path={RouteTripTaskListTask.routePath}
          component={TaskDialog}
        />
      </Switch>
      
      </>;
}
