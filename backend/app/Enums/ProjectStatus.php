<?php

declare(strict_types=1);

namespace App\Enums;

use App\Enums\Concerns\HasValues;

enum ProjectStatus: string
{
    use HasValues;

    case Planning = 'Planning';
    case InProgress = 'In Progress';
    case OnHold = 'On Hold';
    case Completed = 'Completed';

    public function label(): string
    {
        return $this->value;
    }
}
