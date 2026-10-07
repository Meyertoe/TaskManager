import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TaskItem {
  id: number;
  title: string;
  isCompleted: boolean;
}

@Injectable({ providedIn: 'root' })
export class Task {
  private apiUrl = 'http://localhost:5218/api/tasks';

  constructor(private http: HttpClient) {}

  getTasks(): Observable<TaskItem[]> {
    return this.http.get<TaskItem[]>(this.apiUrl);
  }

  addTask(title: string): Observable<TaskItem> {
    return this.http.post<TaskItem>(this.apiUrl, { title, isCompleted: false });
  }

  updateTask(task: TaskItem): Observable<TaskItem> {
    return this.http.put<TaskItem>(`${this.apiUrl}/${task.id}`, task);
  }

  deleteTask(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
