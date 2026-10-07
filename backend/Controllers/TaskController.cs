using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using backend.Models;

namespace backend.Controllers;

[ApiController]
[Authorize]
[Route("api/tasks")]
public class TaskController : ControllerBase
{
    private static readonly object taskLock = new();
    private static int nextId = 2;
    private static readonly List<TaskItem> tasks = new()
    {
        new TaskItem { Id = 1, Title = "Plugga Angular", IsCompleted = false }
    };

    [HttpGet]
    public ActionResult<List<TaskItem>> GetTasks()
    {
        lock (taskLock)
        {
            return Ok(tasks.Select(task => new TaskItem
            {
                Id = task.Id, Title = task.Title, IsCompleted = task.IsCompleted
            }).ToList());
        }
    }

    [HttpPost]
    public ActionResult<TaskItem> CreateTask(TaskItem newTask)
    {
        if (string.IsNullOrWhiteSpace(newTask.Title))
            return BadRequest(new { message = "Titeln får inte vara tom." });

        lock (taskLock)
        {
            newTask.Id = nextId++;
            newTask.Title = newTask.Title.Trim();
            newTask.IsCompleted = false;
            tasks.Add(newTask);
            return StatusCode(201, newTask);
        }
    }

    [HttpPut("{id:int}")]
    public ActionResult<TaskItem> UpdateTask(int id, TaskItem updatedTask)
    {
        if (string.IsNullOrWhiteSpace(updatedTask.Title))
            return BadRequest(new { message = "Titeln får inte vara tom." });

        lock (taskLock)
        {
            var index = tasks.FindIndex(task => task.Id == id);
            if (index == -1)
                return NotFound(new { message = "Uppgiften finns inte längre." });

            updatedTask.Id = id;
            updatedTask.Title = updatedTask.Title.Trim();
            tasks[index] = updatedTask;
            return Ok(updatedTask);
        }
    }

    [HttpDelete("{id:int}")]
    public IActionResult DeleteTask(int id)
    {
        lock (taskLock)
        {
            var task = tasks.Find(task => task.Id == id);
            if (task is null)
                return NotFound(new { message = "Uppgiften finns inte längre." });

            tasks.Remove(task);
            return NoContent();
        }
    }
}
