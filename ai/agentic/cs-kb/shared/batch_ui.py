from __future__ import annotations

import time
from dataclasses import dataclass, field
from enum import Enum

from rich import box
from rich.console import Console, Group
from rich.live import Live
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn, TimeElapsedColumn
from rich.table import Table
from rich.text import Text


class UIMode(str, Enum):
    QUIET = "quiet"
    PRETTY = "pretty"
    FANCY = "fancy"


@dataclass
class BatchRound:
    round_no: int
    execute_id: str
    data_len: int
    duration_sec: float
    status: str


@dataclass
class BatchStats:
    tool_name: str
    workflow_id: str
    rounds: list[BatchRound] = field(default_factory=list)
    total_records: int = 0
    failures: int = 0

    @property
    def success_rounds(self) -> int:
        return sum(1 for r in self.rounds if r.status == "success")


def parse_ui_mode(value: str | UIMode | None) -> UIMode:
    if value is None:
        return UIMode.PRETTY
    if isinstance(value, UIMode):
        return value
    return UIMode(value)


class BatchUI:
    def __init__(self, tool_name: str, workflow_id: str, mode: UIMode | str = UIMode.PRETTY):
        self.mode = parse_ui_mode(mode)
        self.stats = BatchStats(tool_name=tool_name, workflow_id=workflow_id)
        self.console = Console(highlight=False)
        self._current_round = 0
        self._round_started_at = 0.0
        self._live: Live | None = None

    def start(self) -> None:
        if self.mode == UIMode.QUIET:
            return
        if self.mode == UIMode.FANCY:
            self.console.print(
                Panel(
                    Text(f"workflow {self.stats.workflow_id}", style="dim"),
                    title=f"cs-kb / {self.stats.tool_name}",
                    border_style="cyan",
                    box=box.ROUNDED,
                )
            )
            return
        self.console.print(
            Panel(
                Text.assemble(
                    ("工具 ", "dim"),
                    (self.stats.tool_name, "bold cyan"),
                    (" · workflow ", "dim"),
                    (self.stats.workflow_id, "cyan"),
                ),
                title="Batch Run",
                border_style="blue",
                box=box.ROUNDED,
            )
        )

    def begin_round(self, execute_id: str) -> None:
        self._current_round += 1
        self._round_started_at = time.monotonic()
        if self.mode == UIMode.QUIET:
            return
        if self.mode == UIMode.FANCY:
            self._live = Live(
                self._build_fancy_panel(execute_id, "已提交，等待 Coze 执行…"),
                console=self.console,
                refresh_per_second=8,
                transient=False,
            )
            self._live.start()
            return
        self.console.print(
            f"[bold]第 {self._current_round} 轮[/bold] "
            f"[dim]run_id[/dim] [cyan]{execute_id}[/cyan]"
        )

    def end_round(self) -> None:
        if self._live is not None:
            self._live.stop()
            self._live = None

    def sleep_until_next_poll(self, execute_id: str, poll_interval: float = 5.0) -> None:
        deadline = time.monotonic() + poll_interval
        if self.mode == UIMode.QUIET:
            time.sleep(poll_interval)
            return

        if self.mode == UIMode.FANCY:
            while time.monotonic() < deadline:
                elapsed = time.monotonic() - self._round_started_at
                if self._live is not None:
                    self._live.update(
                        self._build_fancy_panel(
                            execute_id,
                            f"轮询 Coze 工作流… {elapsed:.0f}s",
                        )
                    )
                time.sleep(0.25)
            return

        with Progress(
            SpinnerColumn(style="cyan"),
            TextColumn("[progress.description]{task.description}"),
            TimeElapsedColumn(),
            console=self.console,
            transient=True,
        ) as progress:
            task_id = progress.add_task("等待 Coze 执行…", total=None)
            while time.monotonic() < deadline:
                elapsed = time.monotonic() - self._round_started_at
                progress.update(
                    task_id,
                    description=f"等待 Coze 执行… {elapsed:.0f}s",
                )
                time.sleep(0.2)

    def record_round(
        self,
        execute_id: str,
        *,
        status: str,
        data_len: int = 0,
    ) -> None:
        duration = time.monotonic() - self._round_started_at
        round_info = BatchRound(
            round_no=self._current_round,
            execute_id=execute_id,
            data_len=data_len,
            duration_sec=duration,
            status=status,
        )
        self.stats.rounds.append(round_info)
        if status == "success":
            self.stats.total_records += data_len
        elif status == "fail":
            self.stats.failures += 1

        if self.mode == UIMode.QUIET:
            return

        if status == "success":
            style, label = "green", f"✓ 处理 {data_len} 条"
        elif status == "fail":
            style, label = "red", "✗ 失败"
        else:
            style, label = "yellow", "○ 无待处理数据"

        if self.mode == UIMode.FANCY:
            short_id = execute_id if len(execute_id) <= 20 else f"{execute_id[:18]}…"
            self.console.print(
                f"[{style}]#{self._current_round:>3}[/{style}] "
                f"[dim]{duration:5.1f}s[/dim] "
                f"[{style}]{label}[/{style}] "
                f"[dim]{short_id}[/dim]"
            )
            return

        self.console.print(
            f"  [{style}]{label}[/{style}] [dim]{duration:.1f}s[/dim]"
        )

    def finish(self, reason: str) -> None:
        if self.mode == UIMode.QUIET:
            self.console.print(
                f"{self.stats.tool_name}: "
                f"{self.stats.total_records} records, "
                f"{self.stats.success_rounds} rounds — {reason}"
            )
            return

        summary = Table.grid(padding=(0, 2))
        summary.add_row("累计处理", f"[bold cyan]{self.stats.total_records}[/bold cyan] 条")
        summary.add_row("成功轮次", str(self.stats.success_rounds))
        summary.add_row("失败轮次", str(self.stats.failures))
        summary.add_row("结束原因", reason)

        if self.stats.rounds:
            table = Table(box=box.SIMPLE_HEAVY, show_header=True, header_style="bold")
            table.add_column("轮次", justify="right")
            table.add_column("run_id", overflow="ellipsis", max_width=24)
            table.add_column("条数", justify="right")
            table.add_column("耗时", justify="right")
            table.add_column("状态")
            for row in self.stats.rounds:
                if row.status == "success":
                    status_text = Text("success", style="green")
                elif row.status == "fail":
                    status_text = Text("fail", style="red")
                else:
                    status_text = Text("empty", style="yellow")
                table.add_row(
                    str(row.round_no),
                    row.execute_id,
                    str(row.data_len),
                    f"{row.duration_sec:.1f}s",
                    status_text,
                )
            body: Group | Table = Group(summary, table)
        else:
            body = summary

        border = "green" if self.stats.failures == 0 else "yellow"
        self.console.print(
            Panel(
                body,
                title=f"[bold]{self.stats.tool_name}[/bold] 完成",
                border_style=border,
                box=box.ROUNDED,
            )
        )

    def error(self, message: str, *, logid: str | None = None) -> None:
        detail = message if not logid else f"{message} (logid: {logid})"
        if self.mode == UIMode.QUIET:
            self.console.print(f"ERROR: {detail}")
        else:
            self.console.print(f"[bold red]错误[/bold red] {detail}")

    def _build_fancy_panel(self, execute_id: str, status: str) -> Panel:
        info = Table.grid(padding=(0, 1))
        info.add_row("轮次", f"[bold]{self._current_round}[/bold]")
        info.add_row("累计", f"[cyan]{self.stats.total_records}[/cyan] 条")
        info.add_row("失败", str(self.stats.failures))
        info.add_row("run_id", f"[dim]{execute_id}[/dim]")
        info.add_row("状态", status)
        return Panel(
            info,
            title=f"[bold cyan]{self.stats.tool_name}[/bold cyan]",
            border_style="cyan",
            box=box.ROUNDED,
        )
